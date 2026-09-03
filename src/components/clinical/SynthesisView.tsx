import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, GitMerge, Pill, Stethoscope, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";

const RISK_STYLES: Record<string, string> = {
  STABLE: "bg-success/15 text-success",
  "ACTION REQUIRED": "bg-warning/20 text-warning-foreground",
  "CRITICAL RISK": "bg-destructive/15 text-destructive",
};

export function SynthesisView() {
  const { docs, ocrComplete, synthesis, buildSynthesis, setView } = useClinicalStore();
  const [busy, setBusy] = useState(false);

  const build = () => {
    setBusy(true);
    window.setTimeout(() => {
      const s = buildSynthesis();
      setBusy(false);
      toast.success("Chronological synthesis complete", {
        description: `Case ${s.caseId} committed with ${s.timeline.length} timeline events.`,
      });
    }, 900);
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 3</p>
          <h2 className="font-serif text-2xl text-foreground">Synthesis &amp; clinical timeline</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Entity resolution across all translated artefacts, chronological reconstruction of the
            care pathway, and gap analysis against expected follow-up intervals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={build} disabled={busy || !ocrComplete || docs.length === 0}>
            <GitMerge className="mr-2 size-4" />
            {busy ? "Synthesising…" : synthesis ? "Re-synthesise" : "Build synthesis"}
          </Button>
          <Button variant="outline" disabled={!synthesis} onClick={() => setView("report")}>
            Continue to report
          </Button>
        </div>
      </section>

      {!ocrComplete && (
        <section className="panel p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Run the OCR &amp; neural translation step before synthesis.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setView("ocr")}>
            Go to OCR
          </Button>
        </section>
      )}

      {ocrComplete && !synthesis && (
        <section className="panel p-10 text-center">
          <GitMerge className="mx-auto size-8 text-navy" />
          <p className="mt-3 text-sm text-muted-foreground">
            Artefacts are processed. Build the synthesis to resolve entities and reconstruct the
            timeline.
          </p>
        </section>
      )}

      {synthesis && (
        <>
          <section className="panel grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-navy" />
                <h3 className="font-serif text-lg text-foreground">Patient identity</h3>
                <span
                  className={cn(
                    "ml-auto rounded-full px-2.5 py-0.5 text-mono-xs",
                    RISK_STYLES[synthesis.risk],
                  )}
                >
                  {synthesis.risk}
                </span>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Field label="Name" value={synthesis.patientName} />
                <Field label="Age / Sex" value={`${synthesis.age} · ${synthesis.sex}`} />
                <Field label="MRN" value={synthesis.mrn} />
                <Field label="Case ID" value={synthesis.caseId} mono />
              </dl>
              <div>
                <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                  Treating physicians
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                  {synthesis.physicians.map((p) => (
                    <li key={p}>· {p}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-navy" />
                <h3 className="font-serif text-lg text-foreground">Vitals &amp; biomarkers</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {synthesis.vitals.map((v) => (
                  <div
                    key={v.label}
                    className="rounded-md border border-border bg-surface px-3 py-2"
                  >
                    <p className="text-mono-xs text-muted-foreground">{v.label}</p>
                    <p className="text-sm text-foreground">{v.value}</p>
                    <p
                      className={cn(
                        "text-mono-xs",
                        v.status === "high"
                          ? "text-destructive"
                          : v.status === "watch"
                            ? "text-warning-foreground"
                            : "text-success",
                      )}
                    >
                      {v.trend} · {v.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Chronological timeline</TabsTrigger>
              <TabsTrigger value="entities">Resolved entities</TabsTrigger>
              <TabsTrigger value="gaps">Gap analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <section className="panel p-5">
                <ol className="relative space-y-6 border-l border-border pl-6">
                  {synthesis.timeline.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[1.9rem] top-1 flex size-3 items-center justify-center rounded-full bg-navy ring-4 ring-card" />
                      <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                        {e.date} · {e.kind}
                      </p>
                      <h4 className="font-serif text-base text-foreground">{e.title}</h4>
                      <p className="text-mono-xs text-navy">{e.facility}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {e.detail}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </TabsContent>

            <TabsContent value="entities" className="mt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="panel p-5">
                  <h3 className="mb-3 font-serif text-lg text-foreground">
                    Diagnoses (ICD-10 mapped)
                  </h3>
                  <ul className="space-y-2">
                    {synthesis.diagnoses.map((d) => (
                      <li key={d.code} className="flex items-start gap-2 text-sm">
                        <Badge variant="secondary" className="text-mono-xs">
                          {d.code}
                        </Badge>
                        <span className="text-foreground">{d.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-serif text-lg text-foreground">
                    <Pill className="size-4 text-navy" /> Active pharmacotherapy
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {synthesis.medications.map((m) => (
                      <li
                        key={m.name}
                        className="rounded-md border border-border bg-surface px-3 py-2"
                      >
                        <p className="text-foreground">
                          {m.name} — {m.dosage}
                        </p>
                        <p className="text-mono-xs text-muted-foreground">
                          {m.frequency} · since {m.since}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="gaps" className="mt-4">
              <section className="panel p-5">
                <h3 className="mb-3 flex items-center gap-2 font-serif text-lg text-foreground">
                  <AlertTriangle className="size-4 text-warning-foreground" /> Detected gaps &amp;
                  unverified history
                </h3>
                <ul className="space-y-2">
                  {synthesis.gaps.map((g) => (
                    <li
                      key={g}
                      className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm leading-relaxed text-foreground"
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              </section>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <dt className="text-mono-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", mono ? "text-mono-xs" : "text-sm")}>{value}</dd>
    </div>
  );
}
