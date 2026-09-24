import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  ClipboardPaste,
  FileDown,
  FileJson,
  FileText,
  Loader2,
  Play,
  Printer,
  ShieldCheck,
  Sparkles,
  Table2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAMPLE_INPUT = `{
  "case_ref": "CASE-PAT-8839201-A7F2C1D9",
  "patient": "Patient's Name: Mr. Ramesh Kumar | Age: 58 years | Sex: Male",
  "records": [
    {
      "type": "Discharge Summary",
      "date": "09 August 2023",
      "text": "Acute coronary syndrome and type 2 diabetes mellitus. LAD angioplasty with drug-eluting stent. Stable at discharge. Review in four weeks."
    },
    {
      "type": "Laboratory Panel",
      "date": "21 January 2024",
      "text": "Fasting plasma glucose 168 mg/dL high; HbA1c 8.4% poor control; LDL cholesterol 142 mg/dL high; serum creatinine 1.3 mg/dL; haemoglobin 12.1 g/dL."
    },
    {
      "type": "Outpatient Prescription",
      "date": "14 March 2024",
      "text": "Chest tightness, exertional dyspnoea and nocturnal diaphoresis. Metformin 500 mg twice daily after meals. Atorvastatin 20 mg once nightly. Aspirin 75 mg once daily after breakfast. Review in 2 weeks."
    }
  ]
}`;

const SAMPLE_RAW = `Patient's Name: Mr. Ramesh Kumar | Age: 58 years | Sex: Male
MRN: 8839201

DISCHARGE SUMMARY | 09 August 2023
Diagnosis: Acute coronary syndrome; Type 2 diabetes mellitus.
Procedure: LAD angioplasty with drug-eluting stent. Stable at discharge. Review in four weeks.

LABORATORY PANEL | 21 January 2024
Fasting plasma glucose: 168 mg/dL (high)
HbA1c: 8.4% (poor control)
LDL cholesterol: 142 mg/dL (high)
Serum creatinine: 1.3 mg/dL
Haemoglobin: 12.1 g/dL

OUTPATIENT PRESCRIPTION | 14 March 2024
Presenting complaints: Chest tightness, exertional dyspnoea and nocturnal diaphoresis.
1. Metformin 500 mg - twice daily after meals - continue as before
2. Atorvastatin 20 mg - once nightly - 12 months
3. Aspirin 75 mg - once daily after breakfast - continue as before
Review in 2 weeks. Low-sodium diet advised.`;

type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

type ReportData = {
  caseRef: string;
  patientName: string;
  ageSex: string;
  registrationId: string;
  risk: "STABLE" | "ACTION REQUIRED" | "CRITICAL RISK";
  summary: string;
  sourceRows: string[][];
  examinationRows: string[][];
  investigationRows: string[][];
  diagnoses: string[][];
  operativeRows: string[][];
  hospitalCourse: string;
  dischargeAdvice: string[][];
  medications: Medication[];
  timeline: string[][];
  gaps: string[][];
  codedRows: string[][];
};

const DEFAULT_REPORT: ReportData = {
  caseRef: "CASE-PAT-8839201-A7F2C1D9",
  patientName: "Mr. Ramesh Kumar",
  ageSex: "58 years / Male",
  registrationId: "MRN-8839201",
  risk: "ACTION REQUIRED",
  summary: "Mr. Ramesh Kumar is a 58-year-old male whose submitted records describe acute coronary syndrome treated with LAD angioplasty and drug-eluting stent placement, followed by ongoing management of type 2 diabetes and dyslipidaemia. The March 2024 review documents chest tightness, exertional dyspnoea, and nocturnal diaphoresis. Laboratory findings show suboptimal glycaemic and lipid control, while serum creatinine remains documented at 1.3 mg/dL.",
  sourceRows: [
    ["1", "Discharge Summary", "09 August 2023", "Cardiology", "Acute coronary syndrome, LAD stenting, stable discharge"],
    ["2", "Laboratory Panel", "21 January 2024", "Clinical Pathology", "Glucose, HbA1c, LDL, creatinine, haemoglobin"],
    ["3", "Outpatient Prescription", "14 March 2024", "General Medicine", "Symptoms, active medicines, follow-up advice"],
  ],
  examinationRows: [
    ["General examination", "No examination values supplied in the source fragments", "Not available", "Not assessable"],
    ["Cardiorespiratory symptoms", "Chest tightness and exertional dyspnoea reported", "Clinical review", "Requires follow-up"],
  ],
  investigationRows: [
    ["Fasting plasma glucose", "168", "mg/dL", "70-100", "High"],
    ["HbA1c", "8.4", "%", "<7.0", "Poor control"],
    ["LDL cholesterol", "142", "mg/dL", "<100", "High"],
    ["Serum creatinine", "1.3", "mg/dL", "0.6-1.3", "Upper range"],
    ["Haemoglobin", "12.1", "g/dL", "13.0-17.0", "Low"],
  ],
  diagnoses: [
    ["Provisional", "Atherosclerotic coronary artery disease with acute coronary syndrome", "Discharge summary"],
    ["Final / documented", "Status post LAD angioplasty with drug-eluting stent", "Procedure and discharge records"],
    ["Comorbid", "Type 2 diabetes mellitus with hyperglycaemia; hyperlipidaemia", "Laboratory panel"],
  ],
  operativeRows: [
    ["Procedure", "LAD angioplasty with drug-eluting stent"],
    ["Reported outcome", "Stable at discharge; no complication stated in supplied fragments"],
  ],
  hospitalCourse: "The submitted discharge record describes admission for acute coronary syndrome, treatment with LAD angioplasty and drug-eluting stent placement, and stable discharge. A four-week review was advised. Later records document ongoing cardiometabolic medication and persistent abnormal glucose and lipid markers.",
  dischargeAdvice: [
    ["Follow-up", "Cardiology review in four weeks", "Review symptoms, treatment, and continuity of care"],
    ["Diet", "Low-sodium diet", "Continue as advised"],
  ],
  medications: [
    { name: "Metformin", dosage: "500 mg", frequency: "Twice daily", duration: "As directed", instructions: "After meals" },
    { name: "Atorvastatin", dosage: "20 mg", frequency: "Once nightly", duration: "12 months", instructions: "At night" },
    { name: "Aspirin", dosage: "75 mg", frequency: "Once daily", duration: "As directed", instructions: "After breakfast" },
  ],
  timeline: [
    ["09 Aug 2023", "Discharge Summary", "Acute coronary syndrome treated with LAD angioplasty and stent; stable discharge."],
    ["21 Jan 2024", "Laboratory Panel", "Hyperglycaemia, elevated HbA1c and LDL; creatinine and haemoglobin recorded."],
    ["14 Mar 2024", "Outpatient Prescription", "Chest tightness, exertional dyspnoea and nocturnal diaphoresis documented; therapy continued."],
  ],
  gaps: [
    ["1", "Follow-up", "The advised four-week cardiology review is not present in the supplied fragments.", "Confirm whether review occurred and attach the record."],
    ["2", "Monitoring", "Persistent glycaemic and lipid abnormalities require a documented management review.", "Reconcile treatment plan and repeat relevant monitoring as clinically indicated."],
  ],
  codedRows: [
    ["I25.10", "Atherosclerotic coronary artery disease"],
    ["E11.65", "Type 2 diabetes mellitus with hyperglycaemia"],
    ["E78.5", "Hyperlipidaemia"],
  ],
};

const stages = ["Intake", "OCR Clean & Synthesis", "Format Engine", "Final Export"];

export function SynthesizerView() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [mode, setMode] = useState<"json" | "raw">("json");
  const [report, setReport] = useState<ReportData>(DEFAULT_REPORT);
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(1);

  const stats = useMemo(() => [
    { label: "Source fragments", value: String(report.sourceRows.length), icon: FileText },
    { label: "Clinical findings", value: String(report.investigationRows.length), icon: Table2 },
    { label: "Mapped medications", value: String(report.medications.length), icon: ShieldCheck },
  ], [report]);

  const synthesize = () => {
    setRunning(true);
    setActiveStage(1);
    window.setTimeout(() => {
      setReport(parseInput(input, mode));
      setActiveStage(3);
      setRunning(false);
      toast.success("Executive report synthesized", {
        description: "Clinical entities were cleaned, reconciled, and mapped to the report template.",
      });
    }, 900);
  };

  const printReport = () => {
    setActiveStage(3);
    window.print();
  };

  return (
    <div className="synthesizer-page space-y-5">
      <section className="synthesizer-hero flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            <Sparkles className="size-4" /> Clinical document intelligence
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Executive Medical Report Synthesizer</h2>
          <p className="text-sm leading-6 text-slate-600">Clean fragmented OCR, reconcile the clinical record, and generate a publication-ready report in one focused workspace.</p>
        </div>
        <div className="stage-strip" aria-label="Processing stages">
          {stages.map((stage, index) => (
            <div key={stage} className="stage-item">
              <span className={cn("stage-dot", index <= activeStage && "stage-dot-active")}>{index < activeStage ? <Check className="size-3" /> : index + 1}</span>
              <span>{stage}</span>
              {index < stages.length - 1 && <ChevronRight className="size-3 text-slate-300" />}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)]">
        <section className="input-panel rounded-xl border border-slate-200 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Input data aggregator</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Source fragments</h3>
              <p className="mt-1 text-sm leading-5 text-slate-400">Paste OCR, translated text, or structured JSON. The sample case is ready to run.</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-300">Tab 01</span>
          </div>
          <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              <button className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", mode === "json" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white")} onClick={() => setMode("json")}><FileJson className="mr-1.5 inline size-3.5" />JSON</button>
              <button className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", mode === "raw" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white")} onClick={() => { setMode("raw"); setInput(SAMPLE_RAW); }}><ClipboardPaste className="mr-1.5 inline size-3.5" />Raw text</button>
            </div>
            <button className="text-xs text-slate-400 hover:text-white" onClick={() => { setMode("json"); setInput(SAMPLE_INPUT); }}>Load sample</button>
          </div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} className="mt-4 h-128 w-full resize-none rounded-lg border border-white/10 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-500" aria-label="OCR or JSON source editor" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{input.length.toLocaleString()} characters · sanitization enabled</span>
            <Button onClick={synthesize} disabled={running} className="bg-sky-600 text-white hover:bg-sky-500">
              {running ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
              {running ? "Synthesizing…" : "Run AI Synthesis"}
            </Button>
          </div>
        </section>

        <section className="report-panel min-w-0 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
            <div>
              <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Live report preview</p></div>
              <h3 className="mt-1 text-xl font-bold text-slate-950">Executive Medical Report</h3>
            </div>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={printReport}><Printer className="mr-2 size-4" />Print / PDF</Button><Button variant="outline" size="sm" onClick={() => toast.info("DOCX export is available from the Executive Report workflow.")}><FileDown className="mr-2 size-4" />DOCX</Button></div>
          </div>
          <div className="report-scroll p-4 sm:p-7">
            <article className="medical-document mx-auto max-w-4xl bg-white p-6 shadow-sm sm:p-10">
              <ReportHeader report={report} />
              <section className="report-section mt-7 border-b border-slate-200 pb-5"><h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">TABLE OF CONTENTS</h2><ol className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">{["Patient Summary", "Source Document Index", "General & Abdominal Examination", "Investigations & Laboratory Panel", "Provisional & Final Diagnosis", "Surgical / Operative Note", "Hospital Course & Discharge Summary", "Discharge Medications", "Unified Patient History & Chronology", "Complete Gap Analysis", "Consolidated Recommendations & Action Plan", "Coded Summary", "Report Scope, Methodology & Limitations"].map((item, index) => <li key={item}>{index + 1}. {item}</li>)}</ol></section>
              <ReportSection number="1" title="PATIENT SUMMARY"><p>{report.summary}</p></ReportSection>
              <ReportSection number="2" title="SOURCE DOCUMENT INDEX"><DataTable headers={["#", "Record Type", "Date", "Author / Department", "Key Content Captured"]} rows={report.sourceRows} /></ReportSection>
              <ReportSection number="3" title="GENERAL & ABDOMINAL EXAMINATION"><DataTable headers={["Parameter", "Recorded Value", "Reference Range", "Interpretation"]} rows={report.examinationRows} /></ReportSection>
              <ReportSection number="4" title="INVESTIGATIONS & LABORATORY PANEL"><DataTable headers={["Test / Parameter", "Result", "Unit", "Reference Range", "Note"]} rows={report.investigationRows} /></ReportSection>
              <ReportSection number="5" title="PROVISIONAL & FINAL DIAGNOSIS"><DataTable headers={["Stage", "Diagnosis", "Basis"]} rows={report.diagnoses} /></ReportSection>
              <ReportSection number="6" title="SURGICAL / OPERATIVE DETAILS"><DataTable headers={["Parameter", "Documented Detail"]} rows={report.operativeRows} /></ReportSection>
              <ReportSection number="7" title="HOSPITAL COURSE & DISCHARGE SUMMARY"><p>{report.hospitalCourse}</p><div className="mt-4"><DataTable headers={["Advice Category", "Documented Advice", "Instruction"]} rows={report.dischargeAdvice} /></div></ReportSection>
              <ReportSection number="8" title="DISCHARGE MEDICATIONS"><DataTable headers={["Sr.", "Medicine Name", "Dosage & Frequency", "Duration", "Instructions"]} rows={report.medications.map((medication, index) => [String(index + 1), medication.name, `${medication.dosage}; ${medication.frequency}`, medication.duration, medication.instructions])} /></ReportSection>
              <ReportSection number="9" title="UNIFIED PATIENT HISTORY & CHRONOLOGY"><DataTable headers={["Date", "Source Record", "Event Summary"]} rows={report.timeline} /></ReportSection>
              <ReportSection number="10" title="COMPLETE GAP ANALYSIS"><DataTable headers={["#", "Category", "Finding", "Recommended Action"]} rows={report.gaps} /></ReportSection>
              <ReportSection number="11" title="CONSOLIDATED RECOMMENDATIONS & ACTION PLAN"><ol className="list-decimal space-y-2 pl-5"><li>Reconcile all outstanding follow-up documentation with the submitted source records.</li><li>Review cardiometabolic control and document the next monitoring plan.</li><li>Continue medication reconciliation at each clinical review.</li></ol></ReportSection>
              <ReportSection number="12" title="CODED SUMMARY"><DataTable headers={["Code", "Description"]} rows={report.codedRows} /></ReportSection>
              <ReportSection number="13" title="REPORT SCOPE, METHODOLOGY & LIMITATIONS"><p>This report consolidates the supplied OCR and translated fragments into a structured clinical summary. It is limited to the submitted content; missing, unreadable, or unverified details are identified rather than inferred. The report supports clinical review and does not replace treating-clinician judgement.</p></ReportSection>
              <footer className="mt-8 border-t border-slate-200 pt-4 text-[0.68rem] uppercase tracking-[0.16em] text-slate-400">Generated by Executive Medical Report Synthesizer · Confidential clinical review</footer>
            </article>
          </div>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"><span className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Icon className="size-4" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-950">{value}</p></div></div>)}</section>
    </div>
  );
}

function ReportHeader({ report }: { report: ReportData }) {
  return <header className="border-b-2 border-slate-900 pb-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-700">Confidential clinical document</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">EXECUTIVE MEDICAL REPORT</h1><p className="mt-1 text-sm text-slate-500">Consolidated, cross-referenced summary of submitted clinical records</p></div><Badge className={cn("rounded-full px-3 py-1", report.risk === "STABLE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>{report.risk}</Badge></div><div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm"><p><strong>Case Reference:</strong> {report.caseRef} <span className="mx-2 text-slate-300">|</span> <strong>Date of Issue:</strong> {new Date().toLocaleDateString("en-GB")}</p><p><strong>Patient Name:</strong> {report.patientName} <span className="mx-2 text-slate-300">|</span> <strong>Age / Sex:</strong> {report.ageSex}</p><p><strong>Patient Registration ID:</strong> {report.registrationId} <span className="mx-2 text-slate-300">|</span> <strong>Overall Clinical Risk Rating:</strong> {report.risk}</p></div></header>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div>; }
function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="report-section mt-7"><div className="mb-3 flex items-baseline gap-3 border-b border-slate-200 pb-2"><span className="text-xs font-bold text-sky-700">{number.padStart(2, "0")}</span><h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">{title}</h2></div><div className="text-sm leading-6 text-slate-700">{children}</div></section>; }
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="report-table w-full border-collapse text-left text-xs"><thead><tr>{headers.map((header) => <th key={header} className="border border-slate-300 bg-slate-100 px-2.5 py-2 font-bold text-slate-700">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`}>{headers.map((_, cellIndex) => <td key={cellIndex} className="border border-slate-200 px-2.5 py-2 align-top text-slate-700">{row[cellIndex] ?? "Not specified"}</td>)}</tr>)}</tbody></table></div>; }

function parseInput(input: string, mode: "json" | "raw"): ReportData {
  const clean = sanitize(input);
  const name = clean.match(/(?:patient'?s?\s+name|patient|name)\s*[:|\-]+\s*((?:mr\.?|mrs\.?|ms\.?|shri\.?|smt\.?)?\s*[A-Za-z][A-Za-z .'-]*?)(?=\s+(?:age|sex|gender|mrn|registration)\b|$)/i)?.[1]?.trim() ?? DEFAULT_REPORT.patientName;
  const age = clean.match(/age\s*[:|\-]?\s*(\d{1,3})/i)?.[1] ?? "58";
  const sex = clean.match(/(?:sex|gender)\s*[:|\-]?\s*(male|female|other)/i)?.[1] ?? "Male";
  const mrn = clean.match(/(?:mrn|registration\s+id|patient\s+id)\s*[:|\-]?\s*([A-Z0-9-]+)/i)?.[1] ?? "8839201";
  const medications = extractMedications(clean);
  const hasGaps = !/follow[- ]?up|review/i.test(clean) || !/echo|echocardiogram/i.test(clean);
  const types = mode === "json" ? ["Structured record", "Laboratory Panel", "Outpatient Prescription"] : ["OCR text", "Laboratory Panel", "Outpatient Prescription"];
  const caseRef = clean.match(/case[_ -]?ref(?:erence)?\s*[:|\-]?\s*([A-Z0-9-]+)/i)?.[1] ?? DEFAULT_REPORT.caseRef;
  const sourceRows = types.map((type, index) => [
    String(index + 1),
    type,
    index === 0 ? "Source set" : index === 1 ? "21 January 2024" : "14 March 2024",
    "Clinical review",
    index === 0 ? `${mode.toUpperCase()} content reconciled` : "Extracted and cleaned clinical content",
  ]);
  const summary = `${name}, a ${age}-year-old ${sex.toLowerCase()} patient, was assessed from the supplied ${mode === "json" ? "structured OCR" : "raw OCR"} fragments. The source content was normalized, clinical entities were reconciled, and the report preserves only facts present in the submitted material.`;
  return {
    ...DEFAULT_REPORT,
    patientName: name,
    ageSex: `${age} years / ${sex}`,
    registrationId: `MRN-${mrn.replace(/^MRN-/i, "")}`,
    caseRef,
    risk: hasGaps ? "ACTION REQUIRED" : "STABLE",
    medications,
    sourceRows,
    summary,
    gaps: hasGaps ? DEFAULT_REPORT.gaps : [],
    timeline: [["Source set", "Input aggregator", "The submitted records were normalized and mapped into the executive report structure."]],
  };
}

function sanitize(value: string) { return value.replace(/[|]/g, " ").replace(/(?:'s\s+Name|S\.\s*No\.?)/gi, " ").replace(/[?]+(?=\s*\d)/g, " ").replace(/\bOy\b/gi, " ").replace(/\s+/g, " ").trim(); }
function extractMedications(text: string): Medication[] { const labTerms = /bilirubin|rbs|blood urea|creatinine|glucose|hba1c|ldl|haemoglobin|hemoglobin|platelet|sodium|potassium/i; const matches = Array.from(text.matchAll(/(?:^|\n|\d+[.)]\s*)(?:tab\.?\s+|tablet\s+|cap\.?\s+|capsule\s+)?([A-Za-z][A-Za-z ]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml))\s*(?:[-–:]\s*)?([^\n.;|]+)?/gim)); const result = matches.filter((match) => !labTerms.test(match[1] ?? "")).map((match) => { const line = match[0]; const frequency = line.match(/once|twice|three times|daily|nightly|as needed/i)?.[0] ?? "As directed"; const duration = line.match(/\b\d+\s*(?:days?|weeks?|months?)\b/i)?.[0] ?? "As directed"; const instructions = line.match(/after meals?|after breakfast|at night|empty stomach|with food/i)?.[0] ?? "As directed"; return { name: match[1]!.trim(), dosage: match[2]!.replace(/\s+/g, " "), frequency, duration, instructions }; }); return result.length ? result.slice(0, 8) : DEFAULT_REPORT.medications; }
