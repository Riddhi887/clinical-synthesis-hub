import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, GitMerge, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Synthesis } from "@/lib/clinical/data";
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
        description: `Case ${s.caseId} now includes ${s.timeline.length} care events.`,
      });
    }, 900);
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 3</p>
           <h2 className="text-2xl font-semibold text-foreground">Clinical summary &amp; care timeline</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
             A consolidated patient history, chronological care pathway, and review of missing follow-up information.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={build} disabled={busy || !ocrComplete || docs.length === 0}>
            <GitMerge className="mr-2 size-4" />
             {busy ? "Preparing…" : synthesis ? "Refresh summary" : "Prepare summary"}
          </Button>
          <Button variant="outline" disabled={!synthesis} onClick={() => setView("report")}>
            Continue to report
          </Button>
        </div>
      </section>

      {!ocrComplete && (
        <section className="panel p-10 text-center">
          <p className="text-sm text-muted-foreground">
             Process and translate the medical records before preparing the clinical summary.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setView("ocr")}>
             Go to record processing
          </Button>
        </section>
      )}

      {ocrComplete && !synthesis && (
        <section className="panel p-10 text-center">
          <GitMerge className="mx-auto size-8 text-navy" />
          <p className="mt-3 text-sm text-muted-foreground">
             Records are ready. Prepare the summary to organise findings and reconstruct the care timeline.
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

          <section className="panel space-y-7 p-5">
            <div className="max-h-[34rem] space-y-7 overflow-y-auto pr-2">
              <section className="space-y-3">
                <h3 className="font-serif text-xl text-foreground">Clinical summary</h3>
                <p className="max-w-5xl text-base leading-8 text-foreground">
                  {describeCase(synthesis)}
                </p>
              </section>

              <DataTable title="Clinical findings and care events" columns={["Date", "Document", "Finding or event"]}>
                {synthesis.timeline.map((event) => (
                  <tr key={event.id} className="border-t border-border align-top">
                    <td className="px-3 py-3 text-sm whitespace-nowrap">{event.date}</td>
                    <td className="px-3 py-3 text-sm">{event.title}</td>
                    <td className="px-3 py-3 text-sm leading-6">{event.detail}</td>
                  </tr>
                ))}
              </DataTable>

              <DataTable title="Medications identified in the translated records" columns={["Medication", "Dosage", "Frequency", "Period"]}>
                {synthesis.medications.map((medication) => (
                  <tr key={medication.name} className="border-t border-border align-top">
                    <td className="px-3 py-3 text-sm">{medication.name}</td>
                    <td className="px-3 py-3 text-sm">{medication.dosage}</td>
                    <td className="px-3 py-3 text-sm">{medication.frequency}</td>
                    <td className="px-3 py-3 text-sm">{medication.since}</td>
                  </tr>
                ))}
              </DataTable>

              <DataTable title="Medical and translated records" columns={["Record", "Date", "Translated clinical content"]}>
                {docs.filter((doc) => doc.processed).map((doc) => (
                  <tr key={doc.id} className="border-t border-border align-top">
                    <td className="px-3 py-3 text-sm">{doc.classification ?? "Medical record"}</td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">{extractDisplayedDate(doc.translatedText)}</td>
                    <td className="px-3 py-3 text-sm leading-6">{cleanDisplayedRecord(doc.translatedText)}</td>
                  </tr>
                ))}
              </DataTable>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 font-serif text-xl text-foreground">
                  <AlertTriangle className="size-4 text-warning-foreground" /> Gap analysis
                </h3>
                <ul className="space-y-2">
                  {synthesis.gaps.map((gap) => (
                    <li key={gap} className="rounded-md border border-warning/40 bg-warning/10 px-3 py-3 text-sm leading-6">
                      {gap}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function describeCase(synthesis: Synthesis) {
  const physicianText = synthesis.physicians.length
    ? `The documented clinician${synthesis.physicians.length > 1 ? "s" : ""} include${synthesis.physicians.length > 1 ? "" : "s"} ${synthesis.physicians.join(", ")}.`
    : "No treating physician was identified in the translated records.";
  const diagnosisText = synthesis.diagnoses.length
    ? `The records describe ${synthesis.diagnoses.map((diagnosis) => diagnosis.label).join(", ")}.`
    : "No diagnosis was identified in the translated records.";
  const medicationText = synthesis.medications.length
    ? `The documented medications are ${synthesis.medications.map((medication) => `${medication.name} (${medication.dosage}, ${medication.frequency})`).join(", ")}.`
    : "No medication information was identified in the translated records.";
  return `${synthesis.patientName} is a ${synthesis.age || "not specified"}-year-old ${synthesis.sex.toLowerCase()} patient with medical record number ${synthesis.mrn}. ${diagnosisText} ${medicationText} ${physicianText} The care events below are limited to information retrieved and translated from the submitted documents; details not present in those records are not inferred.`;
}

function DataTable({ title, columns, children }: { title: string; columns: string[]; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-serif text-xl text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-[44rem] w-full border-collapse text-left">
          <thead className="bg-surface text-mono-xs uppercase tracking-widest text-muted-foreground">
            <tr>{columns.map((column) => <th key={column} className="px-3 py-3 font-medium">{column}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}

function cleanDisplayedRecord(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/\(as documented,?\s*see source document\)/gi, "").trim())
    .filter((line) => line && !/^here is|^return only|^clinical document translation$|^with one field or table row/i.test(line))
    .filter((line) => !/^(?:hospital address|phone|emergency|registration number)\s*:/i.test(line))
    .slice(0, 12)
    .join(" ");
}

function extractDisplayedDate(text: string) {
  return text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i)?.[0] ?? "Not specified";
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <dt className="text-mono-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", mono ? "text-mono-xs" : "text-sm")}>{value}</dd>
    </div>
  );
}
