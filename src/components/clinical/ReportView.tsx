import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";

const RISK_STYLES: Record<string, string> = {
  STABLE: "bg-success/15 text-success",
  "ACTION REQUIRED": "bg-warning/20 text-warning-foreground",
  "CRITICAL RISK": "bg-destructive/15 text-destructive",
};

export function ReportView() {
  const { docs, synthesis, reportReady, markReportReady, setView } = useClinicalStore();
  const [busy, setBusy] = useState(false);

  const generate = () => {
    setBusy(true);
    window.setTimeout(() => {
      markReportReady();
      setBusy(false);
      toast.success("Executive medical evaluation report generated", {
        description: "Narrative sections synthesised via simulated Llama-3.3-70B-Instruct pipeline.",
      });
    }, 1400);
  };

  const download = (ext: "docx" | "pdf") => {
    if (!synthesis) return;
    const text = plainTextReport();
    const blob = new Blob([text], {
      type:
        ext === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${synthesis.caseId}-medical-evaluation.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Report exported (.${ext})`, {
      description: `${synthesis.caseId} — formal medical evaluation document downloaded.`,
    });
  };

  const plainTextReport = () => {
    if (!synthesis) return "";
    return [
      "MEDICAL EVALUATION REPORT",
      `Case UUID: ${synthesis.caseId}`,
      `Patient: ${synthesis.patientName} · ${synthesis.age}y ${synthesis.sex} · ${synthesis.mrn}`,
      `Date of issue: ${new Date(synthesis.createdAt).toDateString()}`,
      `Overall clinical risk rating: ${synthesis.risk}`,
      "",
      "1. COMPREHENSIVE CLINICAL SUMMARY & HPI",
      hpi(),
      "",
      "2. DOCUMENT-BY-DOCUMENT EXTRACTION BREAKDOWN",
      ...docs.map(
        (d) =>
          `- ${d.name} [${d.classification}] language=${d.language} pages=${d.pages} ocr=${d.ocrConfidence}% translation=${d.translationQuality}%`,
      ),
      "",
      "3. CHRONOLOGICAL PATIENT CARE TIMELINE",
      ...synthesis.timeline.map((t) => `${t.date} — ${t.title} (${t.facility}). ${t.detail}`),
      "",
      "4. DIAGNOSTIC & MEDICATION RECONCILIATION",
      ...synthesis.diagnoses.map((d) => `${d.code} — ${d.label}`),
      ...synthesis.medications.map(
        (m) => `${m.name} ${m.dosage} — ${m.frequency} (since ${m.since})`,
      ),
      ...synthesis.gaps,
      "",
      "5. PHYSICIAN RECOMMENDATIONS & LEGAL EVALUATION SUMMARY",
      recommendations(),
    ].join("\n");
  };

  const hpi = () =>
    synthesis
      ? `${synthesis.patientName}, a ${synthesis.age}-year-old ${synthesis.sex.toLowerCase()} patient (${synthesis.mrn}), presents a documented history spanning ${synthesis.timeline.length} recorded clinical events across ${docs.length || "the submitted"} source artefacts. The record opens with an acute cardiac presentation and progresses through interventional management, subsequent laboratory surveillance, and outpatient continuation of therapy. Present illness is characterised by exertional chest tightness with nocturnal diaphoresis on a background of atherosclerotic coronary disease, type 2 diabetes mellitus with rising glycaemic indices, and hyperlipidaemia that remains above target despite statin therapy. Translated regional documentation corroborates the English-language record without material contradiction.`
      : "";

  const recommendations = () =>
    synthesis
      ? `Cardiology review is advised within fourteen days with echocardiographic assessment of ventricular function, given the radiographic cardiomegaly reported on 11 Feb 2024. Endocrine escalation is warranted: current HbA1c of 8.4 % indicates inadequate control on monotherapy. A full post-operative haematology and renal panel should be obtained to close the identified surveillance gap. From an evaluative standpoint, the documentary chain is internally consistent and adequate to support a finding of continuing cardiac and metabolic morbidity; however, the absence of the recommended echocardiogram and post-stent blood panel limits certainty regarding current functional status and should be remedied before any final determination is issued. Risk rating: ${synthesis.risk}.`
      : "";

  if (!synthesis) {
    return (
      <div className="panel space-y-4 p-6">
        <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 4</p>
        <h2 className="font-serif text-2xl text-foreground">Medical evaluation report</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          No synthesised case is loaded. Complete step 3 to build the clinical synthesis before the
          executive report can be composed.
        </p>
        <Button onClick={() => setView("synthesis")}>Go to synthesis &amp; timeline</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 4</p>
          <h2 className="font-serif text-2xl text-foreground">Medical evaluation report</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Continuous-prose executive evaluation composed from the resolved entity graph and
            chronological care timeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Composing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" /> {reportReady ? "Regenerate" : "Generate"} report
              </>
            )}
          </Button>
          <Button variant="outline" disabled={!reportReady || busy} onClick={() => download("docx")}>
            <Download className="mr-2 size-4" /> .docx
          </Button>
          <Button variant="outline" disabled={!reportReady || busy} onClick={() => download("pdf")}>
            <Download className="mr-2 size-4" /> .pdf
          </Button>
        </div>
      </section>

      {busy && (
        <div className="panel space-y-3 p-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      )}

      {!busy && !reportReady && (
        <div className="panel p-6 text-sm text-muted-foreground">
          Report not yet composed. Press “Generate report” to run the narrative synthesis pipeline.
        </div>
      )}

      {!busy && reportReady && (
        <article className="panel space-y-8 p-7 leading-relaxed">
          <header className="space-y-3 border-b border-border pb-5">
            <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
              confidential medical evaluation · clinical health synthesis system
            </p>
            <h3 className="font-serif text-3xl text-foreground">Executive Medical Evaluation</h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-mono-xs text-muted-foreground">
                case uuid: <span className="text-foreground">{synthesis.caseId}</span>
              </p>
              <p className="text-mono-xs text-muted-foreground">
                patient: <span className="text-foreground">{synthesis.patientName}</span> ·{" "}
                {synthesis.age}y {synthesis.sex} · {synthesis.mrn}
              </p>
              <p className="text-mono-xs text-muted-foreground">
                issued:{" "}
                <span className="text-foreground">
                  {new Date(synthesis.createdAt).toDateString()}
                </span>
              </p>
              <p className="text-mono-xs text-muted-foreground">
                source artefacts: <span className="text-foreground">{docs.length}</span>
              </p>
            </div>
            <Badge className={cn("rounded-full", RISK_STYLES[synthesis.risk])}>
              Overall clinical risk: {synthesis.risk}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Executive summary: multilingual intake reconciled into a single verified care
              chronology; {synthesis.gaps.length} documentation gaps require remediation before final
              determination.
            </p>
          </header>

          <Section title="1. Comprehensive clinical summary & history of present illness">
            <p>{hpi()}</p>
          </Section>

          <Section title="2. Document-by-document extraction breakdown">
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Source documents were cleared from intake; extraction values are retained in the
                persisted synthesis record.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Document</th>
                      <th className="py-2 pr-4">Class</th>
                      <th className="py-2 pr-4">Lang</th>
                      <th className="py-2 pr-4">Pages</th>
                      <th className="py-2 pr-4">OCR</th>
                      <th className="py-2">Translation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-t border-border/70">
                        <td className="py-2 pr-4 font-medium text-foreground">{d.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{d.classification}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{d.language}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{d.pages}</td>
                        <td className="py-2 pr-4 text-mono-xs">{d.ocrConfidence}%</td>
                        <td className="py-2 text-mono-xs">{d.translationQuality}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="3. Chronological patient care timeline & treatment progression">
            <ol className="space-y-4">
              {synthesis.timeline.map((t) => (
                <li key={t.id} className="border-l-2 border-primary/40 pl-4">
                  <p className="text-mono-xs text-muted-foreground">{t.date}</p>
                  <p className="font-medium text-foreground">{t.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.facility} — {t.detail}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="4. Diagnostic & medication reconciliation (gaps & contraindications)">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                  icd-10 diagnoses
                </p>
                {synthesis.diagnoses.map((d) => (
                  <p key={d.code} className="text-sm">
                    <span className="text-mono-xs text-primary">{d.code}</span> — {d.label}
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                  active medications
                </p>
                {synthesis.medications.map((m) => (
                  <p key={m.name} className="text-sm">
                    <span className="font-medium text-foreground">{m.name}</span> {m.dosage} —{" "}
                    {m.frequency} <span className="text-muted-foreground">(since {m.since})</span>
                  </p>
                ))}
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {synthesis.gaps.map((g) => (
                <li
                  key={g}
                  className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
                >
                  {g}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="5. Physician recommendations & legal evaluation summary">
            <p>{recommendations()}</p>
            <p className="mt-3 text-mono-xs text-muted-foreground">
              treating clinicians of record: {synthesis.physicians.join(" · ")}
            </p>
          </Section>

          <footer className="flex items-center gap-2 border-t border-border pt-4 text-mono-xs text-muted-foreground">
            <FileText className="size-3.5" /> deterministic fallback narrative · no patient data
            leaves this browser session
          </footer>
        </article>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="font-serif text-lg text-foreground">{title}</h4>
      <div className="text-sm text-foreground/85">{children}</div>
    </section>
  );
}
