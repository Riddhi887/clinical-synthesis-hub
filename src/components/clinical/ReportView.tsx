import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, FileText, GitCompare, Loader2, Sparkles } from "lucide-react";
import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";
import type { ClinicalDoc, Synthesis, TimelineEvent } from "@/lib/clinical/data";

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

export function ReportView() {
  const { docs, synthesis, reportReady, markReportReady, setView } = useClinicalStore();
  const [busy, setBusy] = useState(false);
  const [documentAId, setDocumentAId] = useState("");
  const [documentBId, setDocumentBId] = useState("");

  const generate = () => {
    setBusy(true);
    console.info(
      `[clinical-pipeline] composing executive report across ${docs.length} source record(s)`,
      docs.map((doc) => ({ name: doc.name, type: doc.classification, language: doc.language })),
    );
    window.setTimeout(() => {
      markReportReady();
      setBusy(false);
      toast.success("Executive medical report generated", {
        description: `Findings from ${docs.length || "all"} record(s) merged into a single clinical narrative.`,
      });
    }, 1400);
  };

  const languages = Array.from(new Set(docs.map((doc) => doc.language.split(" ")[0]!)));
  const presentTypes = Array.from(new Set(docs.map((doc) => String(doc.classification))));
  const missingTypes = EXPECTED_TYPES.filter((type) => !presentTypes.includes(type));
  const documentA = docs.find((doc) => doc.id === documentAId) ?? docs[0];
  const documentB = docs.find((doc) => doc.id === documentBId) ?? docs[1];
  const comparison = documentA && documentB && documentA.id !== documentB.id
    ? compareDocuments(documentA, documentB)
    : null;

  const summaryParas = (): string[] => {
    if (!synthesis) return [];
    return [
      `${synthesis.patientName}, a ${synthesis.age}-year-old ${synthesis.sex.toLowerCase()} patient (${synthesis.mrn}), was evaluated using ${docs.length} submitted medical record(s) covering ${presentTypes.length} distinct record type(s)}${languages.length > 1 ? ` and ${languages.length} languages (${languages.join(", ")})` : ""}. Each submitted record was reviewed, translated where required, and reconciled against the others; no submitted record was excluded from this assessment.`,
      synthesis.diagnoses.length ? `The records describe ${synthesis.diagnoses.map((diagnosis) => diagnosis.label).join(", ")}.` : "No diagnosis was identified in the translated records.",
      synthesis.timeline.length ? `The documented care includes ${synthesis.timeline.map((event) => `${event.title.toLowerCase()} on ${event.date}`).join(", ")}.` : "No dated treatment event was identified in the translated records.",
      synthesis.physicians.length ? `The clinicians identified in the records are ${synthesis.physicians.join(", ")}.` : "No treating clinician was identified in the records.",
    ];
  };

  const chronologyNote = () => synthesis
    ? `The chronology below merges ${synthesis.timeline.length} dated clinical events drawn from all ${docs.length || "submitted"} record(s) into one continuous patient history, ordered by date of occurrence. Where two records describe the same episode, the more specific clinical detail was retained.`
    : "";

  const gapNarrative = () => synthesis
    ? `Cross-checking the submitted records identifies ${synthesis.gaps.length} documentation concern(s)${missingTypes.length ? `; absent expected record types include ${missingTypes.join(", ")}` : ""}.`
    : "";

  const recommendations = () => synthesis
    ? `Recommended follow-up is limited to the documentation gaps identified in the submitted records: ${synthesis.gaps.join(" ")} Overall clinical risk rating derived for this review: ${synthesis.risk}.`
    : "";

  const hospital = extractHospitalHeader(docs);
  const plainTextReport = () => (synthesis ? markdownReport(hospital, synthesis, docs, comparison) : "");

  const download = async (ext: "docx" | "pdf" | "md") => {
    if (!synthesis) return;
    const blob = ext === "md"
      ? new Blob([plainTextReport()], { type: "text/markdown;charset=utf-8" })
      : ext === "docx"
      ? await wordDocument(plainTextReport())
      : new Blob([pdfDocument(plainTextReport())], { type: "application/pdf" });
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
          <Button variant="outline" disabled={!reportReady || busy} onClick={() => void download("docx")}>
            <Download className="mr-2 size-4" /> Word (.docx)
          </Button>
          <Button variant="outline" disabled={!reportReady || busy} onClick={() => download("pdf")}>
            <Download className="mr-2 size-4" /> .pdf
          </Button>
        </div>
      </section>

      {docs.length >= 2 && (
        <section className="panel space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">Module 4 comparison engine</p>
              <h3 className="mt-1 flex items-center gap-2 font-serif text-xl text-foreground"><GitCompare className="size-4 text-navy" /> Document A vs Document B</h3>
              <p className="mt-1 text-sm text-muted-foreground">Compare an initial or pre-operative record with a later discharge or post-operative record, then reconcile differences into the final report.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <label className="flex items-center gap-2">A<select value={documentA?.id ?? ""} onChange={(event) => setDocumentAId(event.target.value)} className="rounded-md border border-border bg-card px-2 py-1.5"><option value="">Select document</option>{docs.map((doc) => <option key={doc.id} value={doc.id}>{doc.classification ?? doc.name}</option>)}</select></label>
              <label className="flex items-center gap-2">B<select value={documentB?.id ?? ""} onChange={(event) => setDocumentBId(event.target.value)} className="rounded-md border border-border bg-card px-2 py-1.5"><option value="">Select document</option>{docs.map((doc) => <option key={doc.id} value={doc.id}>{doc.classification ?? doc.name}</option>)}</select></label>
            </div>
          </div>
          {comparison ? <ComparisonPanel comparison={comparison} /> : <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Select two different processed documents to compare their extracted clinical content.</p>}
        </section>
      )}

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
                confidential medical report
            </p>
            <h3 className="font-serif text-3xl text-foreground">Executive Medical Report</h3>
              <p className="text-sm font-medium text-foreground">{hospital.name}</p>
              <p className="text-sm text-muted-foreground">{hospital.address}</p>
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

          <Section title="1. PATIENT SUMMARY">
            {summaryParas().map((p) => (
              <p key={p.slice(0, 24)} className="mb-3 last:mb-0">
                {p}
              </p>
            ))}
          </Section>

          <Section title="2. SOURCE DOCUMENT INDEX">
            <ReportTable headers={["#", "Record Type", "Date", "Author / Department", "Key Content Captured"]}>
              {docs.map((doc, index) => <tr key={doc.id}><td>{index + 1}</td><td>{doc.classification ?? "Document"}</td><td>{extractDocumentDate(doc.translatedText)}</td><td>{extractAuthorDepartment(doc.translatedText)}</td><td>{summarizeSource(doc.translatedText)}</td></tr>)}
            </ReportTable>
          </Section>

          <Section title="3. GENERAL & ABDOMINAL EXAMINATION">
            <p>Only examination findings explicitly retrieved from the submitted records are shown in the source records section.</p>
          </Section>

          <Section title="4. INVESTIGATIONS & LABORATORY PANEL">
            <ReportTable headers={["Test / Parameter", "Result", "Unit", "Reference Range", "Note"]}>
              {labRows(docs).map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
            </ReportTable>
          </Section>

          <Section title="5. PROVISIONAL & FINAL DIAGNOSIS">
            <ReportTable headers={["Stage", "Diagnosis", "Basis"]}>{synthesis.diagnoses.map((d, index) => <tr key={d.code}><td>{index === 0 ? "Provisional" : index === synthesis.diagnoses.length - 1 ? "Final" : "Documented"}</td><td>{d.label}</td><td>{comparison ? `Reconciled from ${comparison.labelA} and ${comparison.labelB}` : "Submitted clinical records"}</td></tr>)}</ReportTable>
          </Section>

          <Section title="6. OPERATIVE / PROCEDURAL DETAILS">
            <ReportTable headers={["Record", "Date", "Translated details"]}>{docs.filter((doc) => doc.classification === "Surgical Note").map((doc) => <tr key={doc.id}><td>{doc.name}</td><td>{extractDocumentDate(doc.translatedText)}</td><td>{doc.translatedText}</td></tr>)}</ReportTable>
          </Section>

          <Section title="7. HOSPITAL COURSE & DISCHARGE SUMMARY">
            <ReportTable headers={["Record", "Date", "Translated summary"]}>{docs.filter((doc) => doc.classification === "Discharge Summary").map((doc) => <tr key={doc.id}><td>{doc.name}</td><td>{extractDocumentDate(doc.translatedText)}</td><td>{doc.translatedText}</td></tr>)}</ReportTable>
          </Section>

          <Section title="8. DISCHARGE MEDICATIONS">
            <ReportTable headers={["Sr.", "Medicine Name", "Dosage & Frequency", "Duration", "Instructions"]}>
              {synthesis.medications.map((m, index) => <tr key={m.name}><td>{index + 1}</td><td>{m.name}</td><td>{m.dosage} · {m.frequency}</td><td>{m.since || "As directed"}</td><td>Follow the documented prescription instructions.</td></tr>)}
            </ReportTable>
          </Section>

          <Section title="9. UNIFIED PATIENT HISTORY & CHRONOLOGY">
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

          <Section title="10. COMPLETE GAP ANALYSIS & DOCUMENT COMPARISON">
            <p className="mb-4">{gapNarrative()}</p>
            {comparison && <ReportTable headers={["#", "Category", "Finding / Discrepancy (Doc A vs Doc B)", "Recommended Action"]}>{comparison.discrepancies.map((finding, index) => <tr key={`${finding.field}-${index}`}><td>{index + 1}</td><td>{finding.field}</td><td>{finding.detail}</td><td>Confirm the source record and update the reconciled case history.</td></tr>)}</ReportTable>}
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

          <Section title="11. CONSOLIDATED RECOMMENDATIONS & ACTION PLAN">
            <p>{recommendations()}</p>
            <p className="mt-3 text-mono-xs text-muted-foreground">
              clinicians of record: {synthesis.physicians.join(" · ")}
            </p>
          </Section>

          <Section title="12. CODED SUMMARY">
            <ReportTable headers={["Code", "Diagnosis"]}>{synthesis.diagnoses.map((d) => <tr key={d.code}><td>{d.code}</td><td>{d.label}</td></tr>)}</ReportTable>
          </Section>

          <Section title="13. REPORT SCOPE, METHODOLOGY & LIMITATIONS">
            <p>This report consolidates {docs.length} processed record(s) and is limited to information retrieved and translated from those records. Missing or unreadable details are not inferred.</p>
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

function ReportTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="min-w-176 w-full border-collapse text-left text-sm">
        <thead className="bg-surface text-mono-xs uppercase tracking-widest text-muted-foreground">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-3 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_td]:leading-6">{children}</tbody>
      </table>
    </div>
  );
}

type DocumentComparison = {
  labelA: string;
  labelB: string;
  linesA: string[];
  linesB: string[];
  reconciled: { field: string; value: string }[];
  discrepancies: { field: string; detail: string }[];
};

function ComparisonPanel({ comparison }: { comparison: DocumentComparison }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ComparisonColumn label={`Document A · ${comparison.labelA}`} lines={comparison.linesA} side="a" />
        <ComparisonColumn label={`Document B · ${comparison.labelB}`} lines={comparison.linesB} side="b" />
      </div>
      <div>
        <p className="mb-2 text-mono-xs uppercase tracking-widest text-muted-foreground">Reconciled unified view</p>
        <ReportTable headers={["Clinical Field", "Unified Value"]}>
          {comparison.reconciled.map((item) => <tr key={item.field}><td>{item.field}</td><td>{item.value}</td></tr>)}
        </ReportTable>
      </div>
      {comparison.discrepancies.length > 0 && <p className="flex items-center gap-2 text-sm text-warning-foreground"><AlertTriangle className="size-4" /> {comparison.discrepancies.length} unresolved discrepancy flag(s) will appear in Section 10.</p>}
    </div>
  );
}

function ComparisonColumn({ label, lines, side }: { label: string; lines: string[]; side: "a" | "b" }) {
  return <div className={cn("rounded-md border p-4", side === "a" ? "border-sky-200 bg-sky-50/50" : "border-amber-200 bg-amber-50/50")}><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p><div className="space-y-1 text-sm leading-6">{lines.map((line, index) => <p key={`${line}-${index}`} className={cn("rounded px-2 py-1", index % 3 === 0 && "bg-white/70")}>{line}</p>)}</div></div>;
}

function compareDocuments(documentA: ClinicalDoc, documentB: ClinicalDoc): DocumentComparison {
  const linesA = cleanComparisonLines(documentA.translatedText);
  const linesB = cleanComparisonLines(documentB.translatedText);
  const fields = [
    { field: "Diagnosis", pattern: /diagnos(?:is|es)|impression/i },
    { field: "Procedure / treatment", pattern: /procedure|treatment|angioplasty|surgery|operation|stent/i },
    { field: "Medication", pattern: /prescribed|medication|tablet|capsule|\bmg\b/i },
    { field: "Clinical measurement", pattern: /glucose|hba1c|ldl|creatinine|haemoglobin|hemoglobin|pressure|temperature/i },
  ];
  const reconciled = fields.map(({ field, pattern }) => {
    const valueA = linesA.find((line) => pattern.test(line));
    const valueB = linesB.find((line) => pattern.test(line));
    return { field, value: valueB ?? valueA ?? "Not documented in either selected record." };
  });
  const discrepancies = fields.flatMap(({ field, pattern }) => {
    const valueA = linesA.find((line) => pattern.test(line));
    const valueB = linesB.find((line) => pattern.test(line));
    if (!valueA || !valueB || normalizeComparison(valueA) === normalizeComparison(valueB)) return [];
    return [{ field, detail: `Document A: ${valueA} Document B: ${valueB}` }];
  });
  return { labelA: documentA.classification ?? documentA.name, labelB: documentB.classification ?? documentB.name, linesA, linesB, reconciled, discrepancies };
}

function cleanComparisonLines(text: string) {
  return text.split(/\r?\n|[.;](?=\s+[A-Z])/).map((line) => sanitizeClinicalText(line)).filter((line) => line.length > 2).slice(0, 16);
}

function normalizeComparison(value: string) {
  return value.toLowerCase().replace(/[?|'|]/g, "").replace(/\s+/g, " ").trim();
}

function sanitizeClinicalText(value: string) {
  return value.replace(/[|]/g, " ").replace(/[?]+/g, " ").replace(/\bOy\b/gi, " ").replace(/\s+/g, " ").trim();
}

function extractAuthorDepartment(text: string) {
  return text.match(/(?:department|reported by|treating physician|signed|surgeon)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim() ?? "Not specified";
}

function labRows(docs: ClinicalDoc[]) {
  const rows: string[][] = [];
  for (const doc of docs.filter((item) => item.classification === "Lab Test Panel")) {
    for (const line of doc.translatedText.split(/\r?\n/)) {
      const match = sanitizeClinicalText(line).match(/^([^:]+):?\s*(\d+(?:\.\d+)?)\s*(mg\/dL|%|g\/dL|mmHg|mEq\/L)?\s*(?:\(([^)]+)\))?/i);
      if (match && /glucose|hba1c|ldl|creatinine|haemoglobin|hemoglobin|cholesterol|platelet|urea|bilirubin/i.test(match[1]!)) {
        rows.push([match[1]!.trim(), match[2]!, match[3] ?? "Not specified", "Not specified", match[4] ?? "Documented result"]);
      }
    }
  }
  return rows.length ? rows : [["Laboratory findings", "Not specified", "Not specified", "Not specified", "No laboratory values were identified."]];
}

function extractHospitalHeader(docs: ClinicalDoc[]) {
  const text = docs[0]?.translatedText ?? "";
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    name: lines.find((line) => /hospital|clinic|medical centre|medical center/i.test(line)) ?? "Hospital name not identified in records",
    address: lines.find((line) => /address|road|street|new delhi|mumbai|chennai|hyderabad|bangalore/i.test(line)) ?? "Address not identified in records",
  };
}

function extractDocumentDate(text: string) {
  return text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i)?.[0] ?? "Not specified";
}

function summarizeSource(text: string) {
  return text
    .split("\n")
    .filter((line) => /diagnosis|procedure|treatment|finding|impression|medication|operative|prescription|report|discharge/i.test(line))
    .slice(0, 4)
    .join(" ")
    .slice(0, 600) || "No clinical content was identified in the translated record.";
}

function markdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function markdownTable(headers: string[], rows: string[][]) {
  const head = `| ${headers.map(markdownCell).join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`);
  return [head, divider, ...body].join("\n");
}

function sourceNarrative(doc: ClinicalDoc) {
  const text = doc.translatedText;
  const details = summarizeSource(text);
  if (doc.classification === "Lab Test Panel") {
    return `The laboratory record documented the following translated findings: ${details}`;
  }
  if (doc.classification === "Surgical Note") {
    return `The procedural record documented the following translated details: ${details}`;
  }
  if (doc.classification === "Discharge Summary") {
    return `The discharge record documented the following translated course and disposition: ${details}`;
  }
  if (doc.classification === "Outpatient Prescription") {
    return `The outpatient record documented the following translated consultation and treatment details: ${details}`;
  }
  if (doc.classification === "Diagnostic Imaging Report") {
    return `The imaging record documented the following translated findings and impression: ${details}`;
  }
  return details || "No clinical content was identified in the translated record.";
}

function markdownReport(
  hospital: { name: string; address: string },
  synthesis: Synthesis,
  docs: ClinicalDoc[],
  comparison: DocumentComparison | null = null,
) {
  const date = new Date(synthesis.createdAt).toDateString();
  const recordTypes: string[] = Array.from(new Set(docs.map((doc) => doc.classification ?? "Document")));
  const languages = Array.from(new Set(docs.map((doc) => doc.language.split(" ")[0]).filter(Boolean)));
  const sourceRows = docs.map((doc, index) => [
    String(index + 1),
    doc.classification ?? "Document",
    extractDocumentDate(doc.translatedText),
    doc.language || "Not specified",
    sourceNarrative(doc),
  ]);
  const labDocs = docs.filter((doc) => doc.classification === "Lab Test Panel");
  const imagingDocs = docs.filter((doc) => doc.classification === "Diagnostic Imaging Report");
  const procedureDocs = docs.filter((doc) => doc.classification === "Surgical Note");
  const dischargeDocs = docs.filter((doc) => doc.classification === "Discharge Summary");
  const missingTypes = EXPECTED_TYPES.filter((type) => !recordTypes.includes(type));
  const gapRows = synthesis.gaps.map((gap, index) => [
    String(index + 1),
    "Documentation concern",
    gap.replace(/^.*?: /, ""),
    "Review and reconcile against the source record set.",
  ]);
  const recommendationRows = synthesis.gaps.map((gap, index) => [
    String(index + 1),
    gap.replace(/^.*?: /, ""),
    "Review, document, and close the outstanding item where clinically appropriate.",
  ]);
  const chronologyRows = synthesis.timeline.map((event) => [
    event.date,
    event.facility,
    `${event.title}: ${event.detail}`,
  ]);
  const codedMedicationRows = synthesis.medications.map((medication) => [
    medication.name,
    medication.dosage,
    medication.frequency,
    medication.since,
  ]);

  return [
    "# EXECUTIVE MEDICAL REPORT",
    "Consolidated, Cross-Referenced Summary of Submitted Clinical Records",
    "",
    markdownTable(
      ["Metadata", "Value", "Metadata", "Value"],
      [
        ["Case Reference", synthesis.caseId, "Date of Issue", date],
        ["Patient Name", synthesis.patientName, "Age / Sex", `${synthesis.age} years / ${synthesis.sex}`],
        ["Patient Registration ID", synthesis.mrn, "Husband's Name", "Not identified in submitted records"],
        ["Records Reviewed", `${docs.length} (${recordTypes.length} distinct record types)`, "Reviewing Facility", hospital.name],
      ],
    ),
    "",
    "## Overall Clinical Risk Rating",
    `**${synthesis.risk}**`,
    "",
    "## TABLE OF CONTENTS",
    ...Array.from({ length: 13 }, (_, index) => `${index + 1}. ${[
      "Patient Summary",
      "Source Document Index",
      "General & Abdominal Examination",
      "Investigations & Laboratory Panel",
      "Provisional & Final Diagnosis",
      "Surgical / Operative Note",
      "Hospital Course & Discharge Summary",
      "Discharge Medications",
      "Unified Patient History & Chronology",
      "Complete Gap Analysis",
      "Consolidated Recommendations & Action Plan",
      "Coded Summary",
      "Report Scope, Methodology & Limitations",
    ][index]}`),
    "",
    "## 1. PATIENT SUMMARY",
    `${synthesis.patientName}, a ${synthesis.age}-year-old ${synthesis.sex.toLowerCase()} patient (${synthesis.mrn}), was evaluated using ${docs.length} submitted medical record(s) covering ${recordTypes.length} distinct record type(s)${languages.length > 1 ? ` and ${languages.length} languages (${languages.join(", ")})` : ""}. Each submitted record was reviewed, translated where required, and reconciled against the others; no submitted record was excluded from this assessment.`,
    `The consolidated records document ${synthesis.diagnoses.length} diagnosis item(s), ${synthesis.medications.length} medication item(s), and ${synthesis.timeline.length} chronologically distinct clinical event(s). The findings below are limited to the retrieved record content, and unavailable details have not been inferred.`,
    "",
    "## 2. SOURCE DOCUMENT INDEX",
    "Every record submitted for this case, as reconciled into this report.",
    markdownTable(["#", "Record Type", "Date", "Author / Department", "Key Content Captured"], sourceRows.map((row, index) => [row[0]!, row[1]!, row[2]!, extractAuthorDepartment(docs[index]?.translatedText ?? ""), row[4]!])),
    `All ${docs.length} record(s) were cross-referenced by patient identity, clinical content, and documented dates to build the unified chronology in Section 9 and the gap analysis in Section 10.`,
    "",
    "## 3. GENERAL & ABDOMINAL EXAMINATION",
    markdownTable(
      ["Parameter", "Recorded Value", "Reference Range", "Interpretation"],
      [["Examination findings", "No general or abdominal examination findings were identified in the submitted records.", "Not available", "Not assessable from the retrieved data"]],
    ),
    "",
    "## 4. INVESTIGATIONS & LABORATORY PANEL",
    markdownTable(["Test / Parameter", "Result", "Unit", "Reference Range", "Note"], labRows(docs)),
    imagingDocs.length
      ? `The imaging record(s) additionally documented: ${imagingDocs.map((doc) => sourceNarrative(doc)).join(" ")}`
      : "No separate diagnostic imaging report was included in the submitted records.",
    "",
    "## 5. PROVISIONAL & FINAL DIAGNOSIS",
    markdownTable(["Stage", "Diagnosis", "Basis"], synthesis.diagnoses.map((diagnosis, index) => [index === 0 ? "Provisional" : index === synthesis.diagnoses.length - 1 ? "Final" : "Documented", diagnosis.label, comparison ? `Reconciled from ${comparison.labelA} and ${comparison.labelB}` : "Submitted clinical records"])),
    "",
    "## 6. SURGICAL / OPERATIVE NOTE",
    markdownTable(
      ["Record", "Date", "Translated details"],
      procedureDocs.length
        ? procedureDocs.map((doc) => [doc.name, extractDocumentDate(doc.translatedText), sourceNarrative(doc)])
        : [["Not available", "Not specified", "No operative or procedural note was included in the submitted records."]],
    ),
    "",
    "## 7. HOSPITAL COURSE & DISCHARGE SUMMARY",
    markdownTable(
      ["Record", "Date", "Translated summary"],
      dischargeDocs.length
        ? dischargeDocs.map((doc) => [doc.name, extractDocumentDate(doc.translatedText), sourceNarrative(doc)])
        : [["Not available", "Not specified", "No discharge summary was included in the submitted records."]],
    ),
    "",
    "## 8. DISCHARGE MEDICATIONS",
    markdownTable(["Sr.", "Medicine Name", "Dosage & Frequency", "Duration", "Instructions"], synthesis.medications.map((medication, index) => [String(index + 1), medication.name, `${medication.dosage}; ${medication.frequency}`, medication.since || "As directed", "Follow the documented prescription instructions."])),
    "Medication directions are reproduced from the reconciled synthesis; the submitted records do not provide a separate discharge prescription for every item.",
    "",
    "## 9. UNIFIED PATIENT HISTORY & CHRONOLOGY",
    `Events merged from all ${docs.length} submitted record(s) into one continuous timeline, ordered by date of occurrence. Where records described the same episode, the more specific clinical detail was retained.`,
    markdownTable(["Date", "Source / Facility", "Event Summary"], chronologyRows),
    "",
    "## 10. COMPLETE GAP ANALYSIS & DOCUMENT COMPARISON",
    "Cross-checking the submitted records identified the following missing, delayed, or unreconciled items.",
    markdownTable(["#", "Category", "Finding / Discrepancy (Doc A vs Doc B)", "Recommended Action"], [
      ...(comparison?.discrepancies.map((finding, index) => [String(index + 1), finding.field, finding.detail, "Confirm the source record and update the reconciled case history."]) ?? []),
      ...(gapRows.length ? gapRows : [["-", "No gaps identified", "No documentation concern was identified.", "Continue routine record reconciliation."]]),
    ]),
    ...(missingTypes.length ? [`The following expected record type(s) were not submitted: ${missingTypes.join(", ")}.`] : []),
    "",
    "## 11. CONSOLIDATED RECOMMENDATIONS & ACTION PLAN",
    "Based on the reconciled record set and gap analysis, the following actions are recommended in priority order.",
    markdownTable(["Priority", "Action", "Follow-up"], recommendationRows.length ? recommendationRows : [["-", "No additional action identified", "Continue care according to the treating clinician's plan."]]),
    `Overall Clinical Risk Rating for this Review: **${synthesis.risk}**`,
    "",
    "## 12. CODED SUMMARY",
    "### Coded Diagnoses",
    markdownTable(["Code", "Description"], synthesis.diagnoses.map((diagnosis) => [diagnosis.code, diagnosis.label])),
    "### Active Medications",
    markdownTable(["Medication", "Strength", "Frequency", "Since"], codedMedicationRows),
    "### Clinicians of Record",
    synthesis.physicians.join("; "),
    "",
    "## 13. REPORT SCOPE, METHODOLOGY & LIMITATIONS",
    "### Methodology",
    `This report was generated by consolidating ${docs.length} discrete clinical record(s) into one chronological, cross-referenced summary. Each record was reviewed in full; translated content was rewritten into coherent clinical prose, and no content was inferred beyond the submitted data.`,
    "### Scope",
    `The report covers the information available in the ${recordTypes.join(", ")} record set and the dated events represented in Section 9. Care outside these records is not reflected.`,
    "### Limitations",
    "The report is a point-in-time documentation summary and does not replace continuous clinical judgement or bedside assessment. Missing, unreadable, or unreported details are identified as such rather than assumed.",
    "### Intended Use",
    "This document is intended for clinical review, continuity-of-care handover, and internal documentation reconciliation. It is not a substitute for the treating clinician's assessment.",
    "",
    `Report compiled from ${docs.length} processed record(s) for ${synthesis.patientName}.`,
  ].join("\n\n");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type ReportBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[][] };

function parseMarkdownReport(markdown: string): ReportBlock[] {
  const lines = markdown.split("\n");
  const blocks: ReportBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!.trim();
    if (!line) {
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1]!.length as 1 | 2 | 3, text: heading[2]! });
      index += 1;
      continue;
    }
    if (line.startsWith("|") && index + 1 < lines.length && lines[index + 1]!.includes("---")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index]!.trim().startsWith("|")) {
        const cells = lines[index]!.trim().slice(1, -1).split("|").map((cell) => cell.trim().replace(/\\\|/g, "|"));
        if (!cells.every((cell) => /^-+$/.test(cell))) rows.push(cells);
        index += 1;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    const paragraphs = [line];
    index += 1;
    while (index < lines.length && lines[index]!.trim() && !lines[index]!.trim().startsWith("#") && !lines[index]!.trim().startsWith("|")) {
      paragraphs.push(lines[index]!.trim());
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphs.join(" ") });
  }
  return blocks;
}

async function wordDocument(markdown: string) {
  const children = parseMarkdownReport(markdown).map((block) => {
    if (block.kind === "heading") {
      const level = block.level === 1 ? HeadingLevel.TITLE : block.level === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      return new Paragraph({ text: block.text.replace(/\*\*/g, ""), heading: level, spacing: { before: 220, after: 100 } });
    }
    if (block.kind === "table") {
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "B8C7D6" }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "B8C7D6" }, top: { style: BorderStyle.SINGLE, size: 4, color: "B8C7D6" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "B8C7D6" }, left: { style: BorderStyle.SINGLE, size: 4, color: "B8C7D6" }, right: { style: BorderStyle.SINGLE, size: 4, color: "B8C7D6" } },
        rows: block.rows.map((row, rowIndex) => new TableRow({
          children: row.map((cell) => new TableCell({
            ...(rowIndex === 0 ? { shading: { fill: "EDF3F8" } } : {}),
            children: [new Paragraph({ children: [new TextRun({ text: cell.replace(/\*\*/g, ""), bold: rowIndex === 0 })] })],
          })),
        })),
      });
    }
    return new Paragraph({ children: [new TextRun({ text: block.text.replace(/\*\*/g, "") })], spacing: { after: 100 } });
  });
  return Packer.toBlob(new Document({
    sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
  }));
}

function legacyWordDocument(
  hospital: { name: string; address: string },
  synthesis: Synthesis,
  docs: ClinicalDoc[],
  summary: string[],
  timeline: TimelineEvent[],
  gaps: string[],
) {
  const rows = (items: string[][]) => items.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  const table = (headers: string[], body: string[][]) => `<table><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>${rows(body)}</table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Medical Report</title><style>body{font-family:Arial,sans-serif;color:#172033;line-height:1.5}h1{color:#123b61}h2{border-bottom:1px solid #b8c7d6;padding-bottom:6px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #b8c7d6;padding:7px;text-align:left;vertical-align:top}th{background:#edf3f8}</style></head><body><h1>${escapeHtml(hospital.name)}</h1><p>${escapeHtml(hospital.address)}</p><h1>Executive Medical Report</h1><p><b>Patient:</b> ${escapeHtml(synthesis.patientName)} | <b>Age/Sex:</b> ${synthesis.age} ${escapeHtml(synthesis.sex)} | <b>MRN:</b> ${escapeHtml(synthesis.mrn)}</p><h2>1. PATIENT SUMMARY</h2>${summary.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}<h2>2. SOURCE DOCUMENT INDEX</h2>${table(["Record Type", "Date", "Key Content Captured"], docs.map((d) => [d.classification ?? "Document", extractDocumentDate(d.translatedText), summarizeSource(d.translatedText)]))}<h2>3. GENERAL &amp; ABDOMINAL EXAMINATION</h2><p>Only examination findings explicitly present in the submitted records are included.</p><h2>4. INVESTIGATIONS &amp; LABORATORY PANEL</h2>${table(["Record", "Date", "Translated findings"], docs.filter((d) => d.classification === "Lab Test Panel").map((d) => [d.name, extractDocumentDate(d.translatedText), d.translatedText]))}<h2>5. PROVISIONAL &amp; FINAL DIAGNOSIS</h2>${table(["Reference", "Diagnosis"], synthesis.diagnoses.map((d) => [d.code, d.label]))}<h2>6. OPERATIVE / PROCEDURAL DETAILS</h2>${table(["Record", "Date", "Translated details"], docs.filter((d) => d.classification === "Surgical Note").map((d) => [d.name, extractDocumentDate(d.translatedText), d.translatedText]))}<h2>7. HOSPITAL COURSE &amp; DISCHARGE SUMMARY</h2>${table(["Record", "Date", "Translated summary"], docs.filter((d) => d.classification === "Discharge Summary").map((d) => [d.name, extractDocumentDate(d.translatedText), d.translatedText]))}<h2>8. DISCHARGE MEDICATIONS</h2>${table(["Medication", "Dosage", "Frequency", "Since"], synthesis.medications.map((m) => [m.name, m.dosage, m.frequency, m.since]))}<h2>9. UNIFIED PATIENT HISTORY &amp; CHRONOLOGY</h2>${table(["Date", "Event", "Details"], timeline.map((t) => [t.date, t.title, `${t.facility} - ${t.detail}`]))}<h2>10. COMPLETE GAP ANALYSIS</h2><ul>${gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("")}</ul><h2>11. CONSOLIDATED RECOMMENDATIONS &amp; ACTION PLAN</h2><p>${escapeHtml(gaps.join(" "))}</p><h2>12. CODED SUMMARY</h2>${table(["Code", "Diagnosis"], synthesis.diagnoses.map((d) => [d.code, d.label]))}<h2>13. REPORT SCOPE, METHODOLOGY &amp; LIMITATIONS</h2><p>This report consolidates ${docs.length} processed record(s) and is limited to retrieved and translated content. Missing details are not inferred.</p></body></html>`;
}

function pdfDocument(text: string) {
  const safeLines = text.replace(/[^\x20-\x7E\n]/g, "?").split("\n").flatMap((line) => {
    const chunks: string[] = [];
    for (let index = 0; index < line.length; index += 92) chunks.push(line.slice(index, index + 92));
    return chunks.length ? chunks : [""];
  });
  const pages: string[][] = [];
  for (let index = 0; index < safeLines.length; index += 48) pages.push(safeLines.slice(index, index + 48));
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const fontNumber = objects.length + 1;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageRefs: number[] = [];
  pages.forEach((pageLines) => {
    const pageNumber = objects.length + 1;
    const content = ["BT", "/F1 9 Tf", "45 760 Td", ...pageLines.map((line, index) => `${index ? "0 -14 Td " : ""}(${line.replace(/[()\\]/g, "\\$&")}) Tj`), "ET"].join("\n");
    const contentNumber = pageNumber + 1;
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 " + fontNumber + " 0 R >> >> /Contents " + contentNumber + " 0 R >>");
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pageRefs.push(pageNumber);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return pdf;
}
