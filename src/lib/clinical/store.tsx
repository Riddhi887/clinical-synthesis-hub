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

export interface ReportSnapshot {
  caseId: string;
  patientName: string;
  createdAt: number;
  documentCount: number;
  documentIds: string[];
  synthesis: Synthesis;
}

interface PersistedState {
  user: string | null;
  view: ViewKey;
  docs: ClinicalDoc[];
  queuedDocs: ClinicalDoc[];
  processingActive: boolean;
  autoProcessNextBatch: boolean;
  reportHistory: ReportSnapshot[];
  logs: string[];
  ocrComplete: boolean;
  synthesis: Synthesis | null;
  reportReady: boolean;
  cases: CaseAsset[];
  folders: Record<string, PatientFolder>;
  activeCaseId: string | null;
  reportsGenerated: number;
}

const STORAGE_KEY = "chss.session.v9";
export const SESSION_SYNC_INTERVAL_MS = 5000;
const LEGACY_STORAGE_KEYS = ["chss.session.v2", "chss.session.v3", "chss.session.v4", "chss.session.v5", "chss.session.v6", "chss.session.v7", "chss.session.v8"];

const initialState: PersistedState = {
  user: null,
  view: "dashboard",
  docs: [],
  queuedDocs: [],
  processingActive: false,
  autoProcessNextBatch: false,
  reportHistory: [],
  logs: [],
  ocrComplete: false,
  synthesis: null,
  reportReady: false,
  cases: [],
  folders: {},
  activeCaseId: null,
  reportsGenerated: 0,
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
  startProcessing: () => void;
  consumeAutoProcessNextBatch: () => void;
}

export function placeDocumentsInQueue<T>(
  active: T[],
  queued: T[],
  incoming: T[],
  processing: boolean,
) {
  return processing
    ? { active, queued: [...queued, ...incoming] }
    : { active: [...active, ...incoming], queued };
}

export function promoteNextBatch<T>(active: T[], queued: T[]) {
  return queued.length ? { active: queued, queued: [] as T[] } : { active, queued };
}

const ASSET_DB_NAME = "chss-session-assets";
const ASSET_STORE_NAME = "uploaded-files";

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(ASSET_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSET_STORE_NAME)) {
        database.createObjectStore(ASSET_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeSourceFile(id: string, file: File) {
  const database = await openAssetDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
    transaction.objectStore(ASSET_STORE_NAME).put(file.slice(0, file.size, file.type), id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

async function readSourceFile(id: string, name: string): Promise<File | undefined> {
  try {
    const database = await openAssetDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const transaction = database.transaction(ASSET_STORE_NAME, "readonly");
      const request = transaction.objectStore(ASSET_STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return blob ? new File([blob], name, { type: blob.type }) : undefined;
  } catch (error) {
    console.warn("Unable to restore a pending source file", error);
    return undefined;
  }
}

async function deleteSourceFile(id: string) {
  try {
    const database = await openAssetDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
      transaction.objectStore(ASSET_STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch (error) {
    console.warn("Unable to remove a stored source file", error);
  }
}

async function clearStoredSourceFiles() {
  try {
    const database = await openAssetDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ASSET_STORE_NAME, "readwrite");
      transaction.objectStore(ASSET_STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch (error) {
    console.warn("Unable to clear stored source files", error);
  }
}

const StoreContext = createContext<StoreValue | null>(null);

export function ClinicalStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Restore session data and pending uploaded files before exposing the workspace.
  useEffect(() => {
    let cancelled = false;
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
      const restored = { ...initialState, ...parsed };
      void Promise.all([
        Promise.all((restored.docs ?? []).map(async (doc) => ({
          ...doc,
          receivedAt: doc.receivedAt ?? Date.now(),
          ...(!doc.sourceFile ? { sourceFile: await readSourceFile(doc.id, doc.name) } : {}),
        }))),
        Promise.all((restored.queuedDocs ?? []).map(async (doc) => ({
          ...doc,
          receivedAt: doc.receivedAt ?? Date.now(),
          ...(!doc.sourceFile ? { sourceFile: await readSourceFile(doc.id, doc.name) } : {}),
        }))),
      ]).then(([docs, queuedDocs]) => {
        if (cancelled) return;
        setState({ ...restored, docs, queuedDocs });
        loaded.current = true;
        setHydrated(true);
      });
    } catch {
      // Deterministic fallback: ignore corrupt state, start clean.
      loaded.current = true;
      setHydrated(true);
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeSession(state));
    } catch {
      /* storage unavailable — session stays in memory */
    }
  }, [state]);

  // Periodic persistence is deliberately outside React state, so it cannot flicker the UI.
  useEffect(() => {
    const sync = () => {
      if (!loaded.current) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeSession(stateRef.current));
      } catch {
        /* session remains available in memory */
      }
    };
    const interval = window.setInterval(sync, SESSION_SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

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
        void clearStoredSourceFiles();
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
            receivedAt: Date.now(),
            ...(f.sourceFile ? { sourceFile: f.sourceFile } : {}),
            language: f.language ?? "",
            pages: f.sourceFile ? 0 : 0,
            sizeKb: f.sizeKb,
            ...(f.classification ? { classification: f.classification } : {}),
            classifierConfidence: f.classification ? 0 : 0,
            originalText: f.originalText ?? "",
            translatedText: f.translatedText ?? "",
            ocrConfidence: f.ocrConfidence ?? 0,
            translationQuality: f.translationQuality ?? 0,
            processed: false,
          };
        });
        created.forEach((doc) => {
          if (doc.sourceFile) void storeSourceFile(doc.id, doc.sourceFile).catch((error) =>
            console.warn("Unable to save an uploaded source file", error),
          );
        });
        patch((s) => {
          const next = placeDocumentsInQueue(s.docs, s.queuedDocs, created, s.processingActive);
          return s.processingActive
            ? { docs: next.active, queuedDocs: next.queued }
            : { docs: next.active, queuedDocs: next.queued, ocrComplete: false, reportReady: false, synthesis: null };
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
          receivedAt: Date.now(),
          analyzed: true,
          processed: false,
        }));
        patch((s) => {
          const next = placeDocumentsInQueue(s.docs, s.queuedDocs, created, s.processingActive);
          return s.processingActive
            ? { docs: next.active, queuedDocs: next.queued }
            : { docs: created, queuedDocs: [], ocrComplete: false, reportReady: false, synthesis: null, logs: [] };
        });
      },
      removeDoc: (id) =>
        (void deleteSourceFile(id), patch((s) => ({
          docs: s.docs.filter((d) => d.id !== id),
          queuedDocs: s.queuedDocs.filter((d) => d.id !== id),
          reportReady: false,
        }))),
      clearIntake: () =>
        (void clearStoredSourceFiles(), patch({ docs: [], queuedDocs: [], logs: [], ocrComplete: false, synthesis: null, reportReady: false })),
      appendLog: (line) => {
        const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
        const entry = `[${ts}] ${line}`;
        console.info(`[clinical-pipeline ${ts}] ${line}`);
        setState((s) => ({ ...s, logs: [...s.logs.slice(-99), entry] }));
      },
      finishOcr: (docs) => patch({ docs, ocrComplete: true }),
      markOcrComplete: () =>
        patch((s) => {
          const complete = s.docs.length > 0 && s.docs.every((doc) => doc.processed && doc.translatedText.trim());
          return {
            docs: s.docs.map((doc) => ({ ...doc, processed: Boolean(doc.analyzed && doc.originalText.trim() && doc.translatedText.trim()), processing: false })),
            ocrComplete: complete,
            processingActive: false,
          };
        }),
      startProcessing: () => patch((s) => ({
        processingActive: true,
        ocrComplete: false,
        reportReady: false,
        synthesis: null,
        docs: s.docs.map((doc) => ({ ...doc, processing: !doc.processed })),
      })),
      consumeAutoProcessNextBatch: () => patch({ autoProcessNextBatch: false }),
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
          const patientName = firstDoc?.patientName ?? firstDoc?.fields?.["patient_name"] ?? "Patient not identified";
          const ageMatch = combinedText.match(/\bage\s*[:|\-]?\s*(\d{1,3})\s*(?:years?|yrs?)?/i);
          const sexMatch = combinedText.match(/\b(?:sex|gender)\s*[:|\-]?\s*([^|\n]+)/i);
          const physicians = Array.from(
            new Set(
              processedDocs
                .map((doc) => doc.fields?.["doctor"])
                .filter((doctor): doctor is string => Boolean(doctor)),
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
          const synthesis: Synthesis = {
              patientName,
              age: ageMatch ? Number(ageMatch[1]) : 0,
              sex: sexMatch?.[1]?.trim() ?? "Not specified",
              mrn: firstDoc?.fields?.["mrn"] ?? "Not specified",
              physicians,
              diagnoses: diagnoses.map((label, index) => ({ code: `DOC-${index + 1}`, label })),
              medications,
              vitals: [],
              timeline,
              gaps,
              risk: gaps.length ? "ACTION REQUIRED" : "STABLE",
              caseId: newCaseId(),
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
          return { ...s, synthesis, cases };
        });
        return result;
      },
      markReportReady: () =>
        patch((s) => {
          if (!s.synthesis) return {};
          const snapshot: ReportSnapshot = {
            caseId: s.synthesis.caseId,
            patientName: s.synthesis.patientName,
            createdAt: Date.now(),
            documentCount: s.docs.length,
            documentIds: s.docs.map((doc) => doc.id),
            synthesis: s.synthesis,
          };
          const promoted = promoteNextBatch(s.docs, s.queuedDocs);
          const hasNextBatch = promoted.active !== s.docs;
          return {
            reportHistory: [...s.reportHistory, snapshot],
            reportReady: !hasNextBatch,
            reportsGenerated: s.reportsGenerated + 1,
            cases: s.cases.map((c) =>
              c.caseId === s.synthesis?.caseId ? { ...c, hasReport: true } : c,
            ),
            ...(hasNextBatch ? {
              docs: promoted.active,
              queuedDocs: promoted.queued,
              ocrComplete: false,
              synthesis: null,
              autoProcessNextBatch: true,
              view: "ocr" as const,
            } : {}),
          };
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
