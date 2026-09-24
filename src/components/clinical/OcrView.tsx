import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Languages, Play, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ClinicalDoc } from "@/lib/clinical/data";
import { useClinicalStore } from "@/lib/clinical/store";


export function OcrView() {
  const { docs, ocrComplete, updateDoc, markOcrComplete, setView } = useClinicalStore();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(ocrComplete ? 100 : 0);
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState("Waiting to process records");
  const [statusTick, setStatusTick] = useState(0);
  
  const [selected, setSelected] = useState<string | null>(docs[0]?.id ?? null);
  const apiBase = import.meta.env["VITE_API_BASE_URL"] ?? "/api";

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setStatusTick((tick) => (tick + 1) % 4), 3000);
    return () => window.clearInterval(id);
  }, [running]);

  const run = async () => {
    if (!docs.length || running) return;
    setRunning(true);
    setProgress(0);
    setStatus("Retrieving the text");
    const total = docs.length;
    let failed = 0;
    for (let i = 0; i < total; i++) {
      const doc = docs[i]!;
      setActive(doc.name);
      setProgress(5);
      setStatus("Retrieving the text");
      if (doc.sourceFile instanceof File) {
        const formData = new FormData();
        formData.append("file", doc.sourceFile);
        try {
          const response = await fetch(`${apiBase}/process-document`, { method: "POST", body: formData });
          if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
          setProgress(35);
          setStatus("Rasterizing and recognizing the text");
          const result = (await response.json()) as {
            language_detected?: string;
            classification?: string;
            classifier_confidence?: number;
            patient_name?: string;
            fields?: Record<string, string>;
            ocr_text?: string;
            translated_text?: string;
            pages?: number;
            ocr_confidence?: number;
            translation_quality?: number;
          };
          updateDoc(doc.id, {
            language: formatLanguage(result.language_detected),
            classification: result.classification as any,
            classifierConfidence: result.classifier_confidence ?? 0,
            ...(result.patient_name ? { patientName: result.patient_name } : {}),
            ...(result.fields ? { fields: result.fields } : {}),
            pages: result.pages ?? 1,
            ocrConfidence: result.ocr_confidence ?? 0,
            translationQuality: result.translation_quality ?? 0,
            originalText: result.ocr_text ?? "",
            translatedText: result.translated_text ?? "",
            processing: false,
            analyzed: true,
          });
          setProgress(92);
          setStatus("Translating the text. This will take a few minutes");
          await wait(160);
          setProgress(100);
        } catch (error) {
          console.error("Document processing failed", error);
          failed += 1;
          updateDoc(doc.id, { processing: false, analyzed: false, processed: false });
        }
      } else if (doc.origin === "sample") {
        setProgress(35);
        setStatus("Rasterizing and recognizing the text");
        await wait(180);
        setProgress(92);
        setStatus("Translating the text. This will take a few minutes");
        await wait(180);
        setProgress(100);
      } else {
        failed += 1;
        updateDoc(doc.id, { processing: false, analyzed: false });
      }
      if (i < total - 1) {
        setProgress(0);
        setStatus("Retrieving the text");
      }
    }
    setActive(null);
    markOcrComplete();
    setRunning(false);
    setStatus(failed ? "Some records need to be processed again" : "All records processed");
    setSelected((s) => s ?? docs[0]!.id);
    if (failed) {
      toast.error("Some records could not be processed", {
        description: `${failed} of ${total} record(s) failed retrieval or analysis. No fallback text was used.`,
      });
    } else {
      toast.success("Records processed and translated", {
        description: `${total} record(s) are ready for clinical review.`,
      });
    }
  };

  const current: ClinicalDoc | undefined =
    docs.find((d) => d.id === selected) ?? docs[0];
  const isSampleCase =
    docs.length > 0 &&
    docs.every(
      (doc) => doc.origin === "sample" || /_(TA|TE|ES|HI|EN)_/i.test(doc.name),
    );
  const hasActualAnalysis = current?.origin === "sample" || current?.analyzed === true;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 2</p>
           <h2 className="text-2xl font-semibold text-foreground">Processing &amp; translating medical records</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
             Review scanned records, recognise medical details, and prepare clear English clinical text.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={running || docs.length === 0}>
            <Play className="mr-2 size-4" />
             {running ? "Processing…" : ocrComplete ? "Process again" : "Process records"}
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
             No records have been added. Return to Import Records to upload or load the sample case.
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
                {active
                  ? `${["Retrieving the text", "Rasterizing and recognizing the text", "Translating the text. This will take a few minutes"][statusTick % 3]}${".".repeat(statusTick)} · ${active}`
                  : status}
              </p>
              <p className="text-mono-xs text-muted-foreground">{progress}%</p>
            </div>
            <Progress value={progress} />
          </section>

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
                    {isSampleCase ? d.language.split(" ")[0] : d.name}
                  </Button>
                ))}
              </div>
            </header>

            {current && (
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-mono-xs">
                    {hasActualAnalysis ? current.classification : "Awaiting document analysis"}
                  </Badge>
                  <span className="text-mono-xs text-muted-foreground">{current.name}</span>
                  {hasActualAnalysis && current.patientName && (
                    <span className="text-mono-xs text-foreground">
                      patient: {current.patientName}
                    </span>
                  )}
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-mono-xs text-success">
                     {hasActualAnalysis ? `recognition ${current.ocrConfidence}%` : "OCR pending"}
                  </span>
                  <span className="rounded-full bg-navy/10 px-2 py-0.5 text-mono-xs text-navy">
                    {hasActualAnalysis ? `translation ${current.translationQuality}%` : "translation pending"}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title={`Original scan text — ${current.language}`}>
                    {hasActualAnalysis ? current.originalText : "Waiting for rasterization and OCR..."}
                  </Panel>
                  <Panel title="Formal English clinical text">
                    {hasActualAnalysis ? current.translatedText : "Waiting for English translation..."}
                  </Panel>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatLanguage(code?: string) {
  const names: Record<string, string> = { hi: "Hindi", ta: "Tamil", te: "Telugu", en: "English", es: "Spanish" };
  return names[code?.toLowerCase() ?? ""] ?? code ?? "Unknown";
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
