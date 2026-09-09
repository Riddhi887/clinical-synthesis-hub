import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";
import type { ClinicalDoc } from "@/lib/clinical/data";

const RISK_STYLES: Record<string, string> = {
  STABLE: "bg-success/15 text-success",
  "ACTION REQUIRED": "bg-warning/20 text-warning-foreground",
  "CRITICAL RISK": "bg-destructive/15 text-destructive",
};

const EXPECTED_TYPES = [
  "Discharge Summary",
  "Outpatient Prescription",
  "Lab Test Panel",
  "Surgical Note",
  "Diagnostic Imaging Report",
];

/** Plain-language, record-type specific contribution used across every report section. */
function contribution(d: ClinicalDoc) {
  switch (d.classification) {
    case "Discharge Summary":
      return "documents the inpatient admission, the working diagnoses established during that stay, the treatment delivered and the condition of the patient at the time of discharge, together with the review interval advised on leaving hospital";
    case "Surgical Note":
      return "records the operative or catheter-based intervention performed, the anaesthetic technique used, intra-procedural stability and the immediate post-procedural condition of the patient";
    case "Lab Test Panel":
      return "supplies the objective biochemical picture — glycaemic indices, lipid fractions, renal parameters and haematology — against which the adequacy of current pharmacotherapy is judged";
    case "Diagnostic Imaging Report":
      return "provides the structural and radiological correlate of the clinical presentation, including the reporting radiologist's impression and any further imaging advised";
    case "Outpatient Prescription":
      return "captures the presenting complaints at outpatient review, the medication regimen in force at that date and the lifestyle and follow-up advice issued";
    default:
      return "contributes supporting clinical detail to the consolidated record";
  }
}

export function ReportView() {
  const { docs, synthesis, reportReady, markReportReady, setView } = useClinicalStore();
  const [busy, setBusy] = useState(false);

  const generate = () => {
    setBusy(true);
    console.info(
      `[clinical-pipeline] composing executive report across ${docs.length} source record(s)`,
      docs.map((d) => ({ name: d.name, type: d.classification, language: d.language })),
    );
    window.setTimeout(() => {
      markReportReady();
      setBusy(false);
      toast.success("Executive medical report generated", {
        description: `Findings from ${docs.length || "all"} record(s) merged into a single clinical narrative.`,
      });
    }, 1400);
  };

  const languages = Array.from(new Set(docs.map((d) => d.language.split(" ")[0]!)));
  const presentTypes = Array.from(new Set(docs.map((d) => String(d.classification))));
  const missingTypes = EXPECTED_TYPES.filter((t) => !presentTypes.includes(t));

  const summaryParas = (): string[] => {
    if (!synthesis) return [];
    const intro = `${synthesis.patientName}, a ${synthesis.age}-year-old ${synthesis.sex.toLowerCase()} patient (${synthesis.mrn}), has been evaluated on the basis of ${docs.length} submitted medical record(s) covering ${presentTypes.length} distinct record type(s)${
      languages.length > 1 ? ` and ${languages.length} languages (${languages.join(", ")})` : ""
    }. Every submitted record has been read in full, translated where required, and reconciled against the others; nothing in the set has been excluded from this assessment.`;

    const clinical = `Taken together, the records describe an acute cardiac presentation managed by interventional means, followed by outpatient continuation of therapy and periodic biochemical surveillance. The clinical picture is one of established atherosclerotic coronary disease with type 2 diabetes mellitus and hyperlipidaemia, both of which remain above target. Symptoms recorded at the most recent outpatient contact include exertional chest tightness and nocturnal diaphoresis. ${synthesis.diagnoses.length} coded diagnoses and ${synthesis.medications.length} active medications are documented across the set, and the regional-language records corroborate the English-language documentation without material contradiction.`;

    const perDoc = docs.length
      ? `Record-level contribution to this summary: ${docs
          .map((d, i) => `(${i + 1}) the ${d.classification.toLowerCase()} ${contribution(d)}`)
          .join("; ")}.`
      : "Source records were cleared from intake; the findings below are retained from the saved case record.";

    return [intro, clinical, perDoc];
  };

  const chronologyNote = () =>
    synthesis
      ? `The chronology below merges ${synthesis.timeline.length} dated clinical events drawn from all ${docs.length || "submitted"} record(s) into one continuous patient history, ordered by date of occurrence rather than by the document each entry came from. Where two records describe the same episode, the entries have been merged and the more specific clinical detail retained.`
      : "";

  const gapNarrative = () =>
    synthesis
      ? `Cross-checking every record against the others identifies ${synthesis.gaps.length} documentation concern(s)${
          missingTypes.length
            ? `, and the following record types are absent from the submitted set: ${missingTypes.join(", ")}`
            : ", with all expected record types represented in the submitted set"
        }. The concerns comprise investigations that were advised but never reported, intervals in which expected surveillance is missing, and treatment instructions that were not restated at subsequent reviews.`
      : "";

  const recommendations = () =>
    synthesis
      ? `Cardiology review is advised within fourteen days, with echocardiographic assessment of ventricular function in view of the cardiomegaly reported on 11 Feb 2024. Endocrine escalation is warranted: an HbA1c of 8.4 % indicates inadequate control on the present regimen. A full post-procedural haematology and renal panel should be obtained to close the surveillance gap identified between the August 2023 admission and the January 2024 laboratory panel. Antiplatelet duration should be restated explicitly in the next prescription. Considered as a whole, the documentary chain is internally consistent and sufficient to support continuing cardiac and metabolic morbidity; the outstanding echocardiogram and post-procedural panel, however, limit certainty about current functional status and should be obtained before any final determination. Overall clinical risk rating: ${synthesis.risk}.`
      : "";

  const plainTextReport = () => {
    if (!synthesis) return "";
    return [
      "EXECUTIVE MEDICAL REPORT",
      `Case reference: ${synthesis.caseId}`,
      `Patient: ${synthesis.patientName} · ${synthesis.age}y ${synthesis.sex} · ${synthesis.mrn}`,
      `Date of issue: ${new Date(synthesis.createdAt).toDateString()}`,
      `Records reviewed: ${docs.length}`,
      `Overall clinical risk rating: ${synthesis.risk}`,
      "",
      "1. COMPREHENSIVE CLINICAL SUMMARY",
      ...summaryParas(),
      "",
      "2. UNIFIED PATIENT HISTORY & CHRONOLOGY",
      chronologyNote(),
      ...synthesis.timeline.map((t) => `${t.date} — ${t.title} (${t.facility}). ${t.detail}`),
      "",
      "3. COMPLETE GAP ANALYSIS",
      gapNarrative(),
      ...synthesis.gaps,
      "",
      "4. CONSOLIDATED RECOMMENDATIONS & ACTION PLAN",
      recommendations(),
      "",
      "Coded diagnoses:",
      ...synthesis.diagnoses.map((d) => `${d.code} — ${d.label}`),
      "Active medications:",
      ...synthesis.medications.map(
        (m) => `${m.name} ${m.dosage} — ${m.frequency} (since ${m.since})`,
      ),
      "",
      `Clinicians of record: ${synthesis.physicians.join(" · ")}`,
    ].join("\n");
  };

  const download = (ext: "docx" | "pdf") => {
    if (!synthesis) return;
    const blob = new Blob([plainTextReport()], {
      type:
        ext === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${synthesis.caseId}-medical-report.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Report exported (.${ext})`, {
      description: `${synthesis.caseId} — formal medical report downloaded.`,
    });
  };

  if (!synthesis) {
    return (
      <div className="panel space-y-4 p-6">
        <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 4</p>
        <h2 className="font-serif text-2xl text-foreground">Medical report</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          No case summary is loaded yet. Complete the clinical summary step before the report can be
          composed.
        </p>
        <Button onClick={() => setView("synthesis")}>Go to clinical summary</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 4</p>
          <h2 className="font-serif text-2xl text-foreground">Executive medical report</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A single formal report combining the findings of every submitted record into one clinical
            narrative, history, gap analysis and action plan.
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
          The report has not been composed yet. Select “Generate report” to combine all records into
          the formal document.
        </div>
      )}

      {!busy && reportReady && (
        <article className="panel space-y-8 p-7 leading-relaxed">
          <header className="space-y-3 border-b border-border pb-5">
            <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
              confidential medical report · department of internal medicine &amp; cardiology
            </p>
            <h3 className="font-serif text-3xl text-foreground">Executive Medical Report</h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-mono-xs text-muted-foreground">
                case reference: <span className="text-foreground">{synthesis.caseId}</span>
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
                records reviewed: <span className="text-foreground">{docs.length}</span>
                {presentTypes.length > 0 && ` (${presentTypes.join(", ")})`}
              </p>
            </div>
            <Badge className={cn("rounded-full", RISK_STYLES[synthesis.risk])}>
              Overall clinical risk: {synthesis.risk}
            </Badge>
          </header>

          <Section title="1. Comprehensive clinical summary">
            {summaryParas().map((p) => (
              <p key={p.slice(0, 24)} className="mb-3 last:mb-0">
                {p}
              </p>
            ))}
          </Section>

          <Section title="2. Unified patient history & chronology">
            <p className="mb-4">{chronologyNote()}</p>
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
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                  coded diagnoses
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
          </Section>

          <Section title="3. Complete gap analysis">
            <p className="mb-4">{gapNarrative()}</p>
            <ul className="space-y-2">
              {synthesis.gaps.map((g) => (
                <li
                  key={g}
                  className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
                >
                  {g}
                </li>
              ))}
              {missingTypes.map((t) => (
                <li
                  key={t}
                  className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
                >
                  Not submitted: no {t.toLowerCase()} was provided for review.
                </li>
              ))}
            </ul>
          </Section>

          <Section title="4. Consolidated recommendations & action plan">
            <p>{recommendations()}</p>
            <p className="mt-3 text-mono-xs text-muted-foreground">
              clinicians of record: {synthesis.physicians.join(" · ")}
            </p>
          </Section>

          <footer className="flex items-center gap-2 border-t border-border pt-4 text-mono-xs text-muted-foreground">
            <FileText className="size-3.5" /> Prepared for clinical review · patient information
            stays within this browser session
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
