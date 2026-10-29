import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SAMPLE_CASE,
  type ClinicalDoc,
  type Synthesis,
} from "./data";

export type ViewKey =
  | "dashboard"
  | "patient"
  | "intake"
  | "ocr"
  | "synthesis"
  | "report";

export interface CaseAsset {
  caseId: string;
  patientName: string;
  createdAt: number;
  docCount: number;
  pages: number;
  risk: Synthesis["risk"];
  hasReport: boolean;
}

/** A patient-scoped folder: every asset here belongs to exactly one case id. */
export interface PatientFolder {
  caseId: string;
  patientName: string;
  mrn: string;
  createdAt: number;
  docs: ClinicalDoc[];
  synthesis: Synthesis | null;
  reportReady: boolean;
}

interface PersistedState {
  user: string | null;
  view: ViewKey;
  docs: ClinicalDoc[];
  logs: string[];
  ocrComplete: boolean;
  synthesis: Synthesis | null;
  reportReady: boolean;
  cases: CaseAsset[];
  folders: Record<string, PatientFolder>;
  activeCaseId: string | null;
  reportsGenerated: number;
  /** Documents staged while a processing batch is running; processed after it finishes. */
  queuedDocIds: string[];
  batchActive: boolean;
  sidebarCollapsed: boolean;
}

const STORAGE_KEY = "chss.session.v9";
const LEGACY_STORAGE_KEYS = ["chss.session.v2", "chss.session.v3", "chss.session.v4", "chss.session.v5", "chss.session.v6", "chss.session.v7", "chss.session.v8"];

const initialState: PersistedState = {
  user: null,
  view: "dashboard",
  docs: [],
  logs: [],
  ocrComplete: false,
  synthesis: null,
  reportReady: false,
  cases: [],
  folders: {},
  activeCaseId: null,
  reportsGenerated: 0,
  queuedDocIds: [],
  batchActive: false,
  sidebarCollapsed: false,
};

/** Simulated PostgreSQL/Supabase uuid primary key generation (client-side). */
export function newUuid() {
  const seg = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `${seg()}${seg()}-${seg()}-${seg()}-${seg()}-${seg()}${seg()}${seg()}`;
}

export function newCaseId() {
  return `CASE-PAT-8839201-${newUuid().slice(0, 8).toUpperCase()}`;
}

interface StoreValue extends PersistedState {
  hydrated: boolean;
  login: (email: string) => void;
  logout: () => void;
  setView: (v: ViewKey) => void;
  addFiles: (
    files: {
      name: string;
      sizeKb: number;
      language?: string;
      classification?: ClinicalDoc["classification"];
      originalText?: string;
      translatedText?: string;
      ocrConfidence?: number;
      translationQuality?: number;
      sourceFile?: File;
    }[],
  ) => number;
  updateDoc: (id: string, changes: Partial<ClinicalDoc>) => void;
  loadSampleCase: () => void;
  removeDoc: (id: string) => void;
  clearIntake: () => void;
  appendLog: (line: string) => void;
  finishOcr: (docs: ClinicalDoc[]) => void;
  markOcrComplete: () => void;
  buildSynthesis: () => Synthesis;
  markReportReady: () => void;
  beginBatch: () => void;
  endBatch: () => void;
  takeQueued: () => string[];
  toggleSidebar: () => void;
  openCase: (caseId: string) => void;
  closeCase: () => void;
  startNewCase: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function ClinicalStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate from persisted session (LocalStorage persistence layer).
  useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        // File handles cannot be persisted; drop stale entries so reprocessing behaves cleanly.
        const cleanDocs = (list: ClinicalDoc[]) =>
          list.map(({ sourceFile, ...doc }) =>
            sourceFile instanceof File ? ({ ...doc, sourceFile } as ClinicalDoc) : (doc as ClinicalDoc),
          );
        setState({
          ...initialState,
          ...parsed,
          docs: cleanDocs(parsed.docs ?? []),
          folders: Object.fromEntries(
            Object.entries(parsed.folders ?? {}).map(([id, f]) => [id, { ...f, docs: cleanDocs(f.docs) }]),
          ),
        });
      }
    } catch {
      // Deterministic fallback: ignore corrupt state, start clean.
    }
    loaded.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — session stays in memory */
    }
  }, [state]);

  const patch = useCallback(
    (p: Partial<PersistedState> | ((s: PersistedState) => Partial<PersistedState>)) =>
      setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) })),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    return {
      ...state,
      hydrated,
      login: (email) => patch({ user: email, view: "dashboard" }),
      logout: () => {
        setState({ ...initialState });
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
      },
      setView: (view) => patch({ view }),
      addFiles: (files) => {
        const created: ClinicalDoc[] = files.map((f) => {
          return {
            id: newUuid(),
            name: f.name,
            origin: "upload",
            processing: true,
            analyzed: false,
            ...(f.sourceFile ? { sourceFile: f.sourceFile } : {}),
            language: f.language ?? "",
            pages: f.sourceFile ? 0 : 0,
            sizeKb: f.sizeKb,
            uploadedAt: Date.now(),
            ...(f.classification ? { classification: f.classification } : {}),
            classifierConfidence: f.classification ? 0 : 0,
            originalText: f.originalText ?? "",
            translatedText: f.translatedText ?? "",
            ocrConfidence: f.ocrConfidence ?? 0,
            translationQuality: f.translationQuality ?? 0,
            processed: false,
          };
        });
        setState((s) => {
          const openFolder = s.activeCaseId ? s.folders[s.activeCaseId] : undefined;
          return {
            ...s,
            docs: [...s.docs, ...created],
            // While a batch is processing, new files join the isolated queue instead
            // of the active batch stream.
            queuedDocIds: s.batchActive
              ? [...s.queuedDocIds, ...created.map((d) => d.id)]
              : s.queuedDocIds,
            ocrComplete: false,
            reportReady: false,
            // Uploads made inside an open patient folder stay bound to that folder.
            folders: openFolder
              ? {
                  ...s.folders,
                  [openFolder.caseId]: { ...openFolder, docs: [...openFolder.docs, ...created] },
                }
              : s.folders,
          };
        });
        return created.length;
      },
      updateDoc: (id, changes) =>
        patch((s) => ({
          docs: s.docs.map((doc) => (doc.id === id ? { ...doc, ...changes } : doc)),
        })),
      loadSampleCase: () => {
        const created: ClinicalDoc[] = SAMPLE_CASE.map((d) => ({
          ...d,
          id: newUuid(),
          origin: "sample" as const,
          analyzed: true,
          processed: false,
          uploadedAt: Date.now(),
        }));
        patch({ docs: created, activeCaseId: null, ocrComplete: false, reportReady: false, synthesis: null, logs: [], queuedDocIds: [], batchActive: false });
      },
      removeDoc: (id) =>
        patch((s) => ({ docs: s.docs.filter((d) => d.id !== id), reportReady: false })),
      clearIntake: () =>
        patch({ docs: [], logs: [], ocrComplete: false, synthesis: null, reportReady: false }),
      appendLog: (line) => {
        const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
        // Processing telemetry stays in the developer console only; the UI remains clean.
        console.info(`[clinical-pipeline ${ts}] ${line}`);
      },
      finishOcr: (docs) => patch({ docs, ocrComplete: true }),
      markOcrComplete: () =>
        patch((s) => {
          const complete = s.docs.length > 0 && s.docs.every(
            (doc) => doc.analyzed && doc.originalText.trim() && doc.translatedText.trim(),
          );
          return {
            docs: s.docs.map((doc) => ({ ...doc, processed: complete && Boolean(doc.analyzed), processing: false })),
            ocrComplete: complete,
          };
        }),
      buildSynthesis: () => {
        let result!: Synthesis;
        setState((s) => {
          const processedDocs = s.docs.filter(
            (doc) => doc.processed && doc.translatedText.trim(),
          );
          const cleanedDocs = processedDocs.map((doc) => ({
            doc,
            text: cleanTranslatedRecord(doc.translatedText),
          }));
          const combinedText = cleanedDocs.map(({ text }) => text).join("\n");
          const firstDoc = processedDocs[0];
          const patientName =
            firstDoc?.patientName ??
            firstDoc?.fields?.["patient_name"] ??
            extractPatientName(combinedText) ??
            "Patient not identified";
          const ageMatch = combinedText.match(/\bage\s*[:|\-]?\s*(\d{1,3})\s*(?:years?|yrs?)?/i);
          const sexMatch = combinedText.match(/\b(?:sex|gender)\s*[:|\-]?\s*([^|\n]+)/i);
          const physicians = Array.from(
            new Set(
              [
                ...processedDocs.map((doc) => doc.fields?.["doctor"]),
                ...Array.from(
                  combinedText.matchAll(
                    /(?:operating surgeon|surgeon|physician|consultant|doctor|reviewed by)\s*[:\-]\s*([^\n|]+)/gi,
                  ),
                ).map((match) => match[1]),
              ]
                .filter((doctor): doctor is string => Boolean(doctor))
                .map((doctor) => doctor.replace(/\s*[,.\-–]\s*$/, "").trim())
                .filter((doctor) => doctor.length > 3),
            ),
          );
          const diagnoses = extractSynthesisItems(
            combinedText,
            /(?:pre-operative diagnosis|post-operative diagnosis|diagnosis|diagnoses|impression)\s*[:\-]?\s*([^\n]+)/gi,
          );
          const medications = extractMedicationItems(combinedText);
          const timeline = cleanedDocs.map(({ doc, text }, index) => ({
            id: `uploaded-${index + 1}`,
            date: extractDate(text),
            title: doc.classification ?? "Document",
            facility: extractFacility(text),
            detail: summarizeDocument(text),
            kind: inferTimelineKind(doc.classification),
          }));
          const gaps = detectGaps(processedDocs, combinedText);
          // Reuse the open folder's case so repeated synthesis keeps one patient folder.
          const caseId = s.activeCaseId ?? newCaseId();
          const synthesis: Synthesis = {
              patientName,
              age: ageMatch ? Number(ageMatch[1]) : 0,
              sex: sexMatch?.[1]?.trim() ?? "Not specified",
              mrn: firstDoc?.fields?.["mrn"] ?? extractMrn(combinedText) ?? "Not specified",
              physicians,
              diagnoses: diagnoses.map((label, index) => ({ code: `DOC-${index + 1}`, label })),
              medications,
              vitals: extractVitals(combinedText),
              timeline,
              gaps,
              risk: gaps.length ? "ACTION REQUIRED" : "STABLE",
              caseId,
              createdAt: Date.now(),
            } satisfies Synthesis;
          result = synthesis;
          const pages = processedDocs.reduce((a, d) => a + d.pages, 0);
          const asset: CaseAsset = {
            caseId: synthesis.caseId,
            patientName: synthesis.patientName,
            createdAt: synthesis.createdAt,
            docCount: s.docs.length,
            pages,
            risk: synthesis.risk,
            hasReport: s.reportReady,
          };
          const cases = s.cases.some((c) => c.caseId === asset.caseId)
            ? s.cases.map((c) => (c.caseId === asset.caseId ? asset : c))
            : [asset, ...s.cases];
          const existingFolder = s.folders[caseId];
          const folder: PatientFolder = existingFolder
            ? { ...existingFolder, docs: s.docs, synthesis, reportReady: s.reportReady }
            : {
                caseId,
                patientName: synthesis.patientName,
                mrn: synthesis.mrn,
                createdAt: synthesis.createdAt,
                docs: s.docs,
                synthesis,
                reportReady: s.reportReady,
              };
          return {
            ...s,
            synthesis,
            cases,
            activeCaseId: caseId,
            folders: { ...s.folders, [caseId]: folder },
          };
        });
        return result;
      },
      markReportReady: () =>
        patch((s) => {
          const folder = s.synthesis ? s.folders[s.synthesis.caseId] : undefined;
          return {
            reportReady: true,
            reportsGenerated: s.reportReady ? s.reportsGenerated : s.reportsGenerated + 1,
            cases: s.cases.map((c) =>
              c.caseId === s.synthesis?.caseId ? { ...c, hasReport: true } : c,
            ),
            folders: folder
              ? { ...s.folders, [folder.caseId]: { ...folder, reportReady: true } }
              : s.folders,
          };
        }),
      beginBatch: () => patch({ batchActive: true }),
      endBatch: () => patch({ batchActive: false }),
      takeQueued: () => {
        const ids = stateRef.current.queuedDocIds;
        setState((s) => ({ ...s, queuedDocIds: [] }));
        return ids;
      },
      toggleSidebar: () => patch((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      openCase: (caseId) => {
        const folder = stateRef.current.folders[caseId];
        if (!folder) return;
        setState((s) => ({
          ...s,
          activeCaseId: caseId,
          view: "patient",
          docs: folder.docs,
          synthesis: folder.synthesis,
          reportReady: folder.reportReady,
          ocrComplete:
            folder.docs.length > 0 &&
            folder.docs.every(
              (d) => d.analyzed && d.originalText.trim() && d.translatedText.trim(),
            ),
          queuedDocIds: [],
          batchActive: false,
        }));
      },
      closeCase: () => patch({ activeCaseId: null }),
      startNewCase: () =>
        patch({
          activeCaseId: null,
          docs: [],
          logs: [],
          ocrComplete: false,
          synthesis: null,
          reportReady: false,
          queuedDocIds: [],
          batchActive: false,
          view: "intake",
        }),
    };
  }, [state, hydrated, patch]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useClinicalStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useClinicalStore must be used inside ClinicalStoreProvider");
  return ctx;
}

function extractSynthesisItems(text: string, pattern: RegExp): string[] {
  return Array.from(text.matchAll(pattern))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/[;,]/).map((item) => item.trim()))
    .filter((value, index, values) => value.length > 2 && values.indexOf(value) === index)
    .slice(0, 12);
}

function cleanTranslatedRecord(text: string): string {
  const noise = [
    /^here is the translated document/i,
    /^here is the reconstructed/i,
    /^return only/i,
    /^clinical document translation$/i,
    /^source document/i,
    /^with one field or table row/i,
  ];
  return text
    .split("\n")
    .map((line) => line.replace(/\(as documented,?\s*see source document\)/gi, "").trim())
    .filter((line) => line && !noise.some((pattern) => pattern.test(line)))
    .filter((line) => !/^(?:hospital address|phone|emergency|registration number)\s*:/i.test(line))
    .join("\n");
}

function extractMedicationItems(text: string): Synthesis["medications"] {
  const lines = text.split("\n").map((line) => line.replace(/^\s*[|•\-\d.)]+\s*/, "").trim());
  return lines
    .filter((line) => /\b(?:tablet|tab\.?|capsule|mg|dose|antibiotic|analgesic|metformin|amlodipine|paracetamol|pantoprazole|drotaverine|rabeprazole|domperidone)\b/i.test(line))
    .map((line) => {
      const dosage = line.match(/\b(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml)|\d+\s*(?:tablet|tablets|capsule|capsules))\b/i)?.[0] ?? "Not stated";
      const frequency = line.match(/\b(?:once|twice|three times|daily|weekly|nightly|as needed|every\s+\d+\s+hours?)\b[^.,;|]*/i)?.[0]?.trim() ?? "Not stated";
      const name = line.split(/\s+(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml)|\d+\s*(?:tablet|tablets|capsule|capsules))\b/i)[0]?.replace(/^(?:tab\.?|tablet|capsule)\s+/i, "").trim() ?? line;
      return { name, dosage, frequency, since: "Not specified" };
    })
    .filter((item, index, values) => item.name.length > 2 && values.findIndex((value) => value.name.toLowerCase() === item.name.toLowerCase()) === index)
    .slice(0, 20);
}

function extractDate(text: string): string {
  const match = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i);
  return match?.[0] ?? "Date not specified";
}

function extractFacility(text: string): string {
  const match = text.match(/(?:hospital|clinic|department|location|operating theatre)\s*[:\-]\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? "Not specified";
}

function summarizeDocument(text: string): string {
  const clinicalLines = text.split("\n").filter((line) => /diagnosis|procedure|treatment|finding|impression|medication|operative|surgery|prescription|report/i.test(line));
  return (clinicalLines.length ? clinicalLines : text.split("\n")).slice(0, 4).join(" ").slice(0, 500);
}

function inferTimelineKind(classification?: ClinicalDoc["classification"]): Synthesis["timeline"][number]["kind"] {
  if (classification === "Surgical Note") return "surgery";
  if (classification === "Lab Test Panel") return "lab";
  if (classification === "Diagnostic Imaging Report") return "imaging";
  if (classification === "Discharge Summary") return "admission";
  return "followup";
}

function detectGaps(docs: ClinicalDoc[], text: string): string[] {
  const expected = [
    ["diagnosis", /diagnosis|diagnoses|impression/i],
    ["procedure or treatment", /procedure|treatment|therapy|operation/i],
    ["follow-up instruction", /follow[- ]?up|review|recommendation|instruction/i],
    ["medication information", /medication|medicine|tablet|dose/i],
  ] as const;
  const gaps = expected
    .filter(([, pattern]) => !pattern.test(text))
    .map(([label]) => `No ${label} was found in the translated records.`);
  if (!docs.some((doc) => /date|january|february|march|april|may|june|july|august|september|october|november|december/i.test(doc.translatedText))) {
    gaps.push("No clinical date was found in the translated records.");
  }
  return gaps.length ? gaps : ["No missing section was detected from the translated records."];
}

function extractPatientName(text: string): string | null {
  const match = text.match(/\bPatient(?:'s name| name)?\s*[:\-]\s*([^\n|/]+)/i);
  const name = match?.[1]?.trim();
  return name && name.length > 2 ? name : null;
}

function extractMrn(text: string): string | null {
  const match = text.match(/\bMRN\b\s*(?:No\.?|number)?\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-]*)/i);
  const id = match?.[1];
  if (!id) return null;
  return /^MRN/i.test(id) ? id : `MRN-${id}`;
}

function extractVitals(text: string): Synthesis["vitals"] {
  const defs: { key: RegExp; grade: (value: number) => "normal" | "watch" | "high" }[] = [
    { key: /fasting (?:blood )?glucose/i, grade: (v) => (v >= 140 ? "high" : v >= 110 ? "watch" : "normal") },
    { key: /hba1c/i, grade: (v) => (v >= 7 ? "high" : v >= 6.5 ? "watch" : "normal") },
    { key: /ldl cholesterol/i, grade: (v) => (v >= 160 ? "high" : v >= 130 ? "watch" : "normal") },
    { key: /serum creatinine/i, grade: (v) => (v >= 1.5 ? "high" : v >= 1.2 ? "watch" : "normal") },
    { key: /haemoglobin|hemoglobin/i, grade: (v) => (v < 10 ? "high" : v <= 13.5 ? "watch" : "normal") },
    { key: /blood pressure/i, grade: (v) => (v >= 140 ? "high" : v >= 130 ? "watch" : "normal") },
  ];
  const vitals: Synthesis["vitals"] = [];
  const usedDefs = new Set<(typeof defs)[number]>();
  for (const line of text.split("\n")) {
    const cleaned = line.replace(/^\s*[|•\-\d.)]+\s*/, "").trim();
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex <= 0) continue;
    const label = cleaned.slice(0, colonIndex).trim();
    const def = defs.find((candidate) => !usedDefs.has(candidate) && candidate.key.test(label));
    if (!def) continue;
    const note = cleaned.match(/\(([^)]+)\)/)?.[1] ?? "";
    const value = cleaned.slice(colonIndex + 1).split("(")[0]?.trim() ?? "";
    const number = Number(value.match(/\d+(?:\.\d+)?/)?.[0] ?? NaN);
    if (!value || !Number.isFinite(number)) continue;
    usedDefs.add(def);
    const status: "normal" | "watch" | "high" = /poor|elevated|high|abnormal|alta|deranged|raised/i.test(note)
      ? "high"
      : /upper limit|borderline|slightly|watch|monitor/i.test(note)
        ? "watch"
        : /normal|stable|satisfactory|within/i.test(note)
          ? "normal"
          : def.grade(number);
    vitals.push({ label, trend: "→ latest", value, status });
    if (vitals.length >= 8) break;
  }
  return vitals;
}
