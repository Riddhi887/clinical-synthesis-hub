import { useState } from "react";
import { toast } from "sonner";
import { Languages, Play, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TELEMETRY_SCRIPT, type ClinicalDoc } from "@/lib/clinical/data";
import { useClinicalStore } from "@/lib/clinical/store";
import { TelemetryConsole } from "./TelemetryConsole";

export function OcrView() {
  const { docs, ocrComplete, appendLog, finishOcr, setView } = useClinicalStore();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(ocrComplete ? 100 : 0);
  const [active, setActive] = useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(docs[0]?.id ?? null);

  const run = async () => {
    if (!docs.length || running) return;
    setRunning(true);
    setProgress(0);
    appendLog("[pipeline] Initiating OCR + neural translation batch across staged artefacts");
    const total = docs.length;
    for (let i = 0; i < total; i++) {
      const doc = docs[i]!;
      setActive(doc.name);
      for (const line of TELEMETRY_SCRIPT(doc)) {
        appendLog(line);
        await wait(180);
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }
    appendLog("[pipeline] Batch complete — all artefacts marked processed=true");
    setActive(null);
    finishOcr(docs.map((d) => ({ ...d, processed: true })));
    setRunning(false);
    setSelected((s) => s ?? docs[0]!.id);
    toast.success("OCR & translation complete", {
      description: `${total} artefact(s) processed with deterministic fallback corpus.`,
    });
  };

  const current: ClinicalDoc | undefined =
    docs.find((d) => d.id === selected) ?? docs[0];

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 2</p>
          <h2 className="font-serif text-2xl text-foreground">OCR &amp; neural translation</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Rasterise each artefact, recognise regional-language glyphs, extract clinical entities
            and translate into formal English clinical prose.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={running || docs.length === 0}>
            <Play className="mr-2 size-4" />
            {running ? "Processing…" : ocrComplete ? "Re-run pipeline" : "Run OCR pipeline"}
          </Button>
          <Button variant="outline" disabled={!ocrComplete} onClick={() => setView("synthesis")}>
            Continue to synthesis
          </Button>
        </div>
      </section>

      {docs.length === 0 ? (
        <section className="panel p-10 text-center">
          <ScanSearch className="mx-auto size-8 text-navy" />
          <p className="mt-3 text-sm text-muted-foreground">
            No artefacts staged. Return to Document Intake to upload or load the sample case.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setView("intake")}>
            Go to intake
          </Button>
        </section>
      ) : (
        <>
          <section className="panel space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-mono-xs text-muted-foreground">
                {active ? `processing → ${active}` : ocrComplete ? "batch processed" : "idle"}
              </p>
              <p className="text-mono-xs text-muted-foreground">{progress}%</p>
            </div>
            <Progress value={progress} />
          </section>

          <TelemetryConsole
            open={consoleOpen}
            onToggle={() => setConsoleOpen((o) => !o)}
            running={running}
          />

          <section className="panel overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
              <Languages className="size-4 text-navy" />
              <h3 className="font-serif text-lg text-foreground">Extraction comparison</h3>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {docs.map((d) => (
                  <Button
                    key={d.id}
                    size="sm"
                    variant={current?.id === d.id ? "default" : "outline"}
                    className={
                      current?.id === d.id
                        ? "text-primary-foreground"
                        : "text-mono-xs"
                    }
                    onClick={() => setSelected(d.id)}
                  >
                    {d.language.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </header>

            {current && (
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-mono-xs">
                    {current.classification}
                  </Badge>
                  <span className="text-mono-xs text-muted-foreground">{current.name}</span>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-mono-xs text-success">
                    OCR {current.ocrConfidence}%
                  </span>
                  <span className="rounded-full bg-navy/10 px-2 py-0.5 text-mono-xs text-navy">
                    translation {current.translationQuality}%
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title={`Original scan text — ${current.language}`}>
                    {current.originalText}
                  </Panel>
                  <Panel title="Formal English clinical text">{current.translatedText}</Panel>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-md border border-border bg-surface">
      <p className="border-b border-border px-3 py-2 text-mono-xs uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-xs leading-relaxed text-foreground">
        {children}
      </pre>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
