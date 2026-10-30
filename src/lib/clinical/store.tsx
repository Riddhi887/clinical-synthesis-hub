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
  type MedicationRecord,
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

export interface QueuedBatch {
  caseId: string;
  docIds: string[];
  createdAt: number;
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
  queuedBatches: QueuedBatch[];
  batchActive: boolean;
  processingCaseId: string | null;
  processingDocName: string | null;
  processingProgress: number;
  processingStatus: string;
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
  queuedBatches: [],
  batchActive: false,
  processingCaseId: null,
  processingDocName: null,
  processingProgress: 0,
  processingStatus: "Waiting to process records",
  sidebarCollapsed: false,
};

/** Per-user workspace archive: what a signed-out reviewer keeps (records, summaries, reports, KPIs). */
const WORKSPACE_ARCHIVE_PREFIX = "chss.workspace.v1:";

interface WorkspaceSnapshot {
  docs: ClinicalDoc[];
  ocrComplete: boolean;
  synthesis: Synthesis | null;
  reportReady: boolean;
  cases: CaseAsset[];
  folders: Record<string, PatientFolder>;
  reportsGenerated: number;
}

const emptyWorkspaceSnapshot = (): WorkspaceSnapshot => ({
  docs: [],
  ocrComplete: false,
  synthesis: null,
  reportReady: false,
  cases: [],
  folders: {},
  reportsGenerated: 0,
});

function stripFileHandles(list: ClinicalDoc[]): ClinicalDoc[] {
  return list.map(({ sourceFile: _sourceFile, ...doc }) => doc);
}

function readWorkspaceArchive(email: string): WorkspaceSnapshot {
  try {
    const raw = window.localStorage.getItem(`${WORKSPACE_ARCHIVE_PREFIX}${email.toLowerCase()}`);
    if (!raw) return emptyWorkspaceSnapshot();
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    return {
      docs: stripFileHandles(parsed.docs ?? []),
      ocrComplete: parsed.ocrComplete ?? false,
      synthesis: parsed.synthesis ?? null,
      reportReady: parsed.reportReady ?? false,
      cases: parsed.cases ?? [],
      folders: Object.fromEntries(
        Object.entries(parsed.folders ?? {}).map(([id, folder]) => [
          id,
          { ...folder, docs: stripFileHandles(folder.docs) },
        ]),
      ),
      reportsGenerated: parsed.reportsGenerated ?? 0,
    };
  } catch {
    // Deterministic fallback: a corrupt archive is ignored and sign-in starts clean.
    return emptyWorkspaceSnapshot();
  }
}

function writeWorkspaceArchive(email: string, s: PersistedState) {
  try {
    const archive: WorkspaceSnapshot = {
      docs: s.docs,
      ocrComplete: s.ocrComplete,
      synthesis: s.synthesis,
      reportReady: s.reportReady,
      cases: s.cases,
      folders: s.folders,
      reportsGenerated: s.reportsGenerated,
    };
    window.localStorage.setItem(
      `${WORKSPACE_ARCHIVE_PREFIX}${email.toLowerCase()}`,
      JSON.stringify(archive),
    );
  } catch {
    /* storage unavailable — archive skipped, session ends in memory */
  }
}

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
  /** Latest documents straight from the store, even after this view unmounts (queue draining). */
  getDocs: () => ClinicalDoc[];
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
  markOcrComplete: (caseId?: string) => void;
  buildSynthesis: (caseId?: string) => Synthesis;
  markReportReady: () => void;
  beginBatch: () => void;
  endBatch: () => void;
  takeQueued: () => QueuedBatch | null;
  assignDocsToCase: (docIds: string[], caseId: string) => void;
  setProcessingState: (changes: Partial<Pick<PersistedState, "processingCaseId" | "processingDocName" | "processingProgress" | "processingStatus">>) => void;
  toggleSidebar: () => void;
  openCase: (caseId: string) => void;
  closeCase: () => void;
  startNewCase: () => void;
  deleteCase: (caseId: string) => Promise<boolean>;
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
      getDocs: () => stateRef.current.docs,
      login: (email) =>
        setState((s) => ({
          ...initialState,
          user: email,
          view: "dashboard",
          sidebarCollapsed: s.sidebarCollapsed,
          // Returning reviewers get their archived records, summaries, reports and KPIs back.
          ...readWorkspaceArchive(email),
        })),
      logout: () =>
        setState((s) => {
          // Archive the workspace under the reviewer's email so KPIs survive sign-out.
          if (s.user) writeWorkspaceArchive(s.user, s);
          return { ...initialState, sidebarCollapsed: s.sidebarCollapsed };
        }),
      setView: (view) => patch({ view }),
      addFiles: (files) => {
        const importCaseId = stateRef.current.view === "intake" || stateRef.current.batchActive
          ? newCaseId()
          : undefined;
        const created: ClinicalDoc[] = files.map((f) => {
          return {
            id: newUuid(),
            name: f.name,
            ...(importCaseId ? { caseId: importCaseId } : {}),
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
          const openFolder = s.view === "patient" && s.activeCaseId
            ? s.folders[s.activeCaseId]
            : undefined;
          return {
            ...s,
            docs: [...s.docs, ...created],
            // While a batch is processing, new files join the isolated queue instead
            // of the active batch stream.
            queuedBatches: s.batchActive && importCaseId
              ? [...s.queuedBatches, { caseId: importCaseId, docIds: created.map((d) => d.id), createdAt: Date.now() }]
              : s.queuedBatches,
            activeCaseId: !s.batchActive && importCaseId ? importCaseId : s.activeCaseId,
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
        patch({ docs: created, activeCaseId: null, ocrComplete: false, reportReady: false, synthesis: null, logs: [], queuedBatches: [], batchActive: false });
      },
      removeDoc: (id) =>
        patch((s) => ({
          docs: s.docs.filter((d) => d.id !== id),
          queuedBatches: s.queuedBatches
            .map((batch) => ({ ...batch, docIds: batch.docIds.filter((docId) => docId !== id) }))
            .filter((batch) => batch.docIds.length > 0),
          reportReady: false,
        })),
      clearIntake: () =>
        patch({ docs: [], logs: [], ocrComplete: false, synthesis: null, reportReady: false, queuedBatches: [] }),
      appendLog: (line) => {
        const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
        // Processing telemetry stays in the developer console only; the UI remains clean.
        console.info(`[clinical-pipeline ${ts}] ${line}`);
      },
      finishOcr: (docs) => patch({ docs, ocrComplete: true }),
      markOcrComplete: (caseId) =>
        patch((s) => {
          const targetDocs = caseId ? s.docs.filter((doc) => doc.caseId === caseId) : s.docs;
          const complete = targetDocs.length > 0 && targetDocs.every(
            (doc) => doc.analyzed && doc.originalText.trim() && doc.translatedText.trim(),
          );
          return {
            docs: s.docs.map((doc) => doc.caseId === caseId
              ? { ...doc, processed: complete && Boolean(doc.analyzed), processing: false }
              : caseId ? doc : { ...doc, processed: complete && Boolean(doc.analyzed), processing: false }),
            ocrComplete: complete,
          };
        }),
      buildSynthesis: (caseId) => {
        let result!: Synthesis;
        setState((s) => {
          const targetCaseId = caseId ?? s.activeCaseId;
          const caseDocs = targetCaseId ? s.docs.filter((doc) => doc.caseId === targetCaseId) : s.docs;
          const processedDocs = s.docs.filter(
            (doc) => caseDocs.includes(doc) && doc.processed && doc.translatedText.trim(),
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
          const extractedMedications = extractMedicationItems(combinedText);
          const structuredMedications = processedDocs.flatMap((doc) => doc.medications ?? []);
          const medications = mergeMedicationItems(structuredMedications, extractedMedications);
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
          const resolvedCaseId = targetCaseId ?? newCaseId();
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
              caseId: resolvedCaseId,
              createdAt: Date.now(),
            } satisfies Synthesis;
          result = synthesis;
          const pages = processedDocs.reduce((a, d) => a + d.pages, 0);
          const asset: CaseAsset = {
            caseId: synthesis.caseId,
            patientName: synthesis.patientName,
            createdAt: synthesis.createdAt,
            docCount: caseDocs.length,
            pages,
            risk: synthesis.risk,
            hasReport: s.reportReady,
          };
          const cases = s.cases.some((c) => c.caseId === asset.caseId)
            ? s.cases.map((c) => (c.caseId === asset.caseId ? asset : c))
            : [asset, ...s.cases];
          const existingFolder = s.folders[resolvedCaseId];
          const folder: PatientFolder = existingFolder
            ? { ...existingFolder, docs: caseDocs, synthesis, reportReady: s.reportReady }
            : {
                caseId: resolvedCaseId,
                patientName: synthesis.patientName,
                mrn: synthesis.mrn,
                createdAt: synthesis.createdAt,
                docs: caseDocs,
                synthesis,
                reportReady: s.reportReady,
              };
          return {
            ...s,
            synthesis,
            cases,
            activeCaseId: resolvedCaseId,
            folders: { ...s.folders, [resolvedCaseId]: folder },
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
        const batch = stateRef.current.queuedBatches[0] ?? null;
        if (batch) setState((s) => ({ ...s, queuedBatches: s.queuedBatches.slice(1) }));
        return batch;
      },
      assignDocsToCase: (docIds, caseId) =>
        patch((s) => ({
          activeCaseId: caseId,
          docs: s.docs.map((doc) => docIds.includes(doc.id) ? { ...doc, caseId } : doc),
        })),
      setProcessingState: (changes) => patch(changes),
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
          queuedBatches: [],
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
          queuedBatches: [],
          batchActive: false,
          view: "intake",
        }),
      deleteCase: async (caseId: string) => {
        // 1. Delete records folder from backend
        let backendDeleted = false;
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
          const res = await fetch(`${apiBase}/cases/${encodeURIComponent(caseId)}`, {
            method: "DELETE",
          }).catch(() => null);
          backendDeleted = Boolean(res?.ok);

          if (!backendDeleted) {
            // Direct fallback if port 8000 accessed locally
            const fallback = await fetch(`http://localhost:8000/cases/${encodeURIComponent(caseId)}`, {
              method: "DELETE",
            }).catch(() => null);
            backendDeleted = Boolean(fallback?.ok);
          }
        } catch (err) {
          console.warn(`[storage] Could not remove backend records folder for case ${caseId}:`, err);
        }

        if (!backendDeleted) return false;

        // 2. Remove case & records folder from frontend state
        setState((s) => {
          const nextFolders = { ...s.folders };
          delete nextFolders[caseId];

          const nextCases = s.cases.filter((c) => c.caseId !== caseId);
          const deletedFolder = s.folders[caseId];
          const deletedCase = s.cases.find((c) => c.caseId === caseId);
          const isCurrentCase = s.activeCaseId === caseId || s.synthesis?.caseId === caseId;
          const removedReport = deletedFolder?.reportReady || deletedCase?.hasReport;

          const nextState: PersistedState = {
            ...s,
            reportsGenerated: removedReport ? Math.max(0, s.reportsGenerated - 1) : s.reportsGenerated,
            folders: nextFolders,
            cases: nextCases,
            ...(isCurrentCase
              ? {
                  activeCaseId: null,
                  docs: [],
                  logs: [],
                  ocrComplete: false,
                  synthesis: null,
                  reportReady: false,
                  queuedBatches: [],
                  batchActive: false,
                }
              : {}),
          };

          if (nextState.user) {
            writeWorkspaceArchive(nextState.user, nextState);
          }

          return nextState;
        });

        return true;
      },
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
  if (!text || !text.trim()) return [];

  const nonDrugTerms = /\b(?:bilirubin|creatinine|blood urea|urea|bun|glucose|fasting glucose|plasma glucose|hba1c|cholesterol|ldl|hdl|triglycerides|haemoglobin|hemoglobin|platelet|platelets|sodium|potassium|wbc|rbc|calcium|troponin|sgot|sgpt|bilirubin|alkaline|blood pressure|pulse|spo2|heart rate|respiratory rate|ct ratio|cardiomegaly|effusion|infiltrate|consolidation|stent|angioplasty|catheterisation|ecg|x-ray|radiograph)\b/i;

  const rawSegments = text
    .split(/\n|;|\bRx\s*[:\-]|(?:\d+[.)]\s+(?:Tab\.?|Cap\.?|Tablet|Capsule))/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const candidateSegments: string[] = [];
  for (const seg of rawSegments) {
    if (seg.includes(",") && /\b(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml))\b/i.test(seg)) {
      const doseMatches = seg.match(/\b(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml))\b/gi);
      if (doseMatches && doseMatches.length > 1) {
        const parts = seg.split(/,|(?:\band\b)/i);
        for (const p of parts) {
          if (p.trim()) candidateSegments.push(p.trim());
        }
        continue;
      }
    }
    candidateSegments.push(seg);
  }

  const results: Synthesis["medications"] = [];

  for (const line of candidateSegments) {
    const hasDose = /\b(?:\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu)|\d+\s*(?:tablets?|capsules?|drops?|puffs?|tsp|tbsp))\b/i.test(line);
    const hasMedKeyword = /\b(?:tab\.?|tablet|cap\.?|capsule|syr\.?|syrup|inj\.?|injection|ointment|drops?|prescribed|medication|pharmacotherapy|rx|dose)\b/i.test(line);
    const hasKnownDrug = /\b(?:metformin|atorvastatin|aspirin|clopidogrel|amlodipine|pantoprazole|paracetamol|losartan|telmisartan|rosuvastatin|ramipril|enalapril|lisinopril|metoprolol|atenolol|carvedilol|furosemide|torsemide|spironolactone|glimepiride|gliclazide|dapagliflozin|empagliflozin|sitagliptin|vildagliptin|insulin|levothyroxine|omeprazole|rabeprazole|esomeprazole|ranitidine|famotidine|ibuprofen|diclofenac|tramadol|aceclofenac|drotaverine|amoxicillin|azithromycin|ciprofloxacin|levofloxacin|ceftriaxone|cefixime|doxycycline|montelukast|cetirizine|levocetirizine|salbutamol|budesonide|alprazolam|clonazepam|lorazepam|gabapentin|pregabalin|multivitamin)\b/i.test(line);

    if (!hasDose && !hasMedKeyword && !hasKnownDrug) continue;

    // 1. Extract Dosage (strength / amount)
    const doseMatch = line.match(/\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml))?|\d+\s*(?:tablets?|capsules?|drops?|puffs?|tsp|tbsp))\b/i);
    const dosage = doseMatch ? doseMatch[0].replace(/\s+/g, " ") : "As directed";

    // 2. Extract Duration / How much time / Since
    let duration = "As directed";
    const durationMatch = line.match(/\b(?:for\s+(\d+\s*(?:days?|weeks?|months?|years?))|(\d+\s*(?:days?|weeks?|months?|years?)\s*(?:post-stent|post-op|duration))|x\s*(\d+\s*(?:days?|weeks?|months?))|since\s+([A-Za-z0-9\s,]+)|review in\s+(\d+\s*(?:days?|weeks?|months?))|(ongoing|long[- ]term|continuous|chronic))\b/i);
    if (durationMatch) {
      if (durationMatch[1]) duration = `For ${durationMatch[1]}`;
      else if (durationMatch[2]) duration = durationMatch[2];
      else if (durationMatch[3]) duration = `For ${durationMatch[3]}`;
      else if (durationMatch[4]) duration = `Since ${durationMatch[4].trim()}`;
      else if (durationMatch[5]) duration = `${durationMatch[5]} (until review)`;
      else if (durationMatch[6]) duration = "Ongoing";
    } else if (/post-stent|dual antiplatelet/i.test(line)) {
      duration = "12 months post-stent";
    } else if (/two weeks/i.test(text) && /review in two weeks/i.test(text) && /metformin|atorvastatin|aspirin/i.test(line)) {
      duration = "2 weeks (until review)";
    }

    // 3. Extract Frequency & How many per day
    let frequency = "As directed";
    let timesPerDay = "As directed";

    if (/\b(?:1-0-1|1\s*-\s*0\s*-\s*1)\b/.test(line)) {
      frequency = "Twice daily (2 per day: morning & night)";
      timesPerDay = "2 per day";
    } else if (/\b(?:1-1-1|1\s*-\s*1\s*-\s*1)\b/.test(line)) {
      frequency = "Three times daily (3 per day: morning, afternoon & night)";
      timesPerDay = "3 per day";
    } else if (/\b(?:1-0-0|1\s*-\s*0\s*-\s*0)\b/.test(line)) {
      frequency = "Once daily (1 per day: morning)";
      timesPerDay = "1 per day";
    } else if (/\b(?:0-0-1|0\s*-\s*0\s*-\s*1)\b/.test(line)) {
      frequency = "Once nightly (1 per day: at bedtime)";
      timesPerDay = "1 per day";
    } else if (/\b(?:0-1-0|0\s*-\s*1\s*-\s*0)\b/.test(line)) {
      frequency = "Once daily (1 per day: afternoon)";
      timesPerDay = "1 per day";
    } else if (/\b(?:1-1-1-1|1\s*-\s*1\s*-\s*1\s*-\s*1)\b/.test(line)) {
      frequency = "Four times daily (4 per day)";
      timesPerDay = "4 per day";
    } else if (/\b(?:b\.?i\.?d\.?|bd)\b/i.test(line)) {
      frequency = "Twice daily (2 per day: BID)";
      timesPerDay = "2 per day";
    } else if (/\b(?:t\.?i\.?d\.?|tds)\b/i.test(line)) {
      frequency = "Three times daily (3 per day: TID)";
      timesPerDay = "3 per day";
    } else if (/\b(?:q\.?i\.?d\.?)\b/i.test(line)) {
      frequency = "Four times daily (4 per day: QID)";
      timesPerDay = "4 per day";
    } else if (/\b(?:o\.?d\.?|q\.?d\.?)\b/i.test(line)) {
      frequency = "Once daily (1 per day: OD)";
      timesPerDay = "1 per day";
    } else if (/\b(?:q\.?h\.?s\.?|hs)\b/i.test(line)) {
      frequency = "Once nightly at bedtime (1 per day)";
      timesPerDay = "1 per day";
    } else if (/\b(?:p\.?r\.?n\.?|s\.?o\.?s\.?)\b/i.test(line)) {
      frequency = "As needed (SOS / PRN)";
      timesPerDay = "As needed";
    } else if (/\b(?:twice\s+daily|twice\s+a\s+day|2\s+times\s+(?:a|per)\s+day|2\s+times\s+daily)\b/i.test(line)) {
      frequency = "Twice daily (2 per day)";
      timesPerDay = "2 per day";
    } else if (/\b(?:three\s+times\s+daily|thrice\s+daily|three\s+times\s+a\s+day|3\s+times\s+(?:a|per)\s+day|3\s+times\s+daily)\b/i.test(line)) {
      frequency = "Three times daily (3 per day)";
      timesPerDay = "3 per day";
    } else if (/\b(?:four\s+times\s+daily|4\s+times\s+(?:a|per)\s+day)\b/i.test(line)) {
      frequency = "Four times daily (4 per day)";
      timesPerDay = "4 per day";
    } else if (/\b(?:once\s+nightly|nightly|at\s+night|at\s+bedtime|before\s+sleep)\b/i.test(line)) {
      frequency = "Once nightly (1 per day: at bedtime)";
      timesPerDay = "1 per day";
    } else if (/\b(?:once\s+daily|once\s+a\s+day|1\s+time\s+(?:a|per)\s+day|1\s+per\s+day|every\s+morning|daily)\b/i.test(line)) {
      frequency = "Once daily (1 per day)";
      timesPerDay = "1 per day";
    } else if (/\b(?:every\s+(\d+)\s+hours?)\b/i.test(line)) {
      const hrs = line.match(/\bevery\s+(\d+)\s+hours?\b/i)?.[1];
      frequency = `Every ${hrs} hours (${Math.round(24 / Number(hrs))} times/day)`;
      timesPerDay = `${Math.round(24 / Number(hrs))} per day`;
    }

    // 4. Extract Instructions / Timing
    let instructions = "Follow prescription instructions";
    const instMatch = line.match(/\b(?:after\s+(?:breakfast\s+and\s+dinner|breakfast|dinner|lunch|meals?|food)|before\s+(?:breakfast|dinner|lunch|meals?|food)|empty\s+stomach|with\s+(?:food|meals?|water|milk)|at\s+bedtime|post-meal|pre-meal)\b/i);
    if (instMatch) {
      instructions = instMatch[0].charAt(0).toUpperCase() + instMatch[0].slice(1).toLowerCase();
    } else if (/after breakfast and dinner/i.test(line)) {
      instructions = "After breakfast and dinner";
    } else if (/after breakfast/i.test(line)) {
      instructions = "After breakfast";
    } else if (/nightly|at night|bedtime/i.test(line)) {
      instructions = "At bedtime";
    }

    // 5. Extract Drug Name
    let cleanLine = line
      .replace(/^\s*(?:[-*•|#]|\d+[.)])\s*/, "")
      .replace(/\(as documented[^\)]*\)/gi, "")
      .trim();

    let name = "";
    const nameWithPrefixMatch = cleanLine.match(/^(?:tab\.?|tablet|cap\.?|capsule|syr\.?|syrup|inj\.?|injection|ointment)\s+([A-Za-z0-9/\-]+(?:\s+[A-Za-z0-9/\-]+)?)/i);
    if (nameWithPrefixMatch) {
      name = nameWithPrefixMatch[1].trim();
    } else if (doseMatch) {
      const beforeDose = cleanLine.split(doseMatch[0])[0].trim();
      const tokens = beforeDose.split(/[\s,–—:-]+/).filter((t) => t.length > 1 && !/^(?:tab\.?|tablet|cap\.?|capsule|prescribed|rx|take|give)$/i.test(t));
      if (tokens.length > 0) {
        name = tokens.slice(-2).join(" ");
      }
    }

    if (!name || name.length < 3) {
      const knownMatch = cleanLine.match(/\b(metformin|atorvastatin|aspirin|clopidogrel|amlodipine|pantoprazole|paracetamol|losartan|telmisartan|rosuvastatin|ramipril|enalapril|lisinopril|metoprolol|atenolol|carvedilol|furosemide|torsemide|spironolactone|glimepiride|gliclazide|dapagliflozin|empagliflozin|sitagliptin|vildagliptin|insulin|levothyroxine|omeprazole|rabeprazole|esomeprazole|ranitidine|famotidine|ibuprofen|diclofenac|tramadol|aceclofenac|drotaverine|amoxicillin|azithromycin|ciprofloxacin|levofloxacin|ceftriaxone|cefixime|doxycycline|montelukast|cetirizine|levocetirizine|salbutamol|budesonide|alprazolam|clonazepam|lorazepam|gabapentin|pregabalin)\b/i);
      if (knownMatch) {
        name = knownMatch[1];
      }
    }

    name = name.replace(/^(?:tab\.?|tablet|cap\.?|capsule)\s+/i, "").trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);

    if (name.length > 2 && !nonDrugTerms.test(name)) {
      const existing = results.find((r) => r.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (dosage !== "As directed" && existing.dosage === "As directed") existing.dosage = dosage;
        if (frequency !== "As directed" && existing.frequency === "As directed") existing.frequency = frequency;
        if (duration !== "As directed" && (existing.since === "As directed" || existing.since === "Not specified")) {
          existing.since = duration;
          existing.duration = duration;
        }
        if (instructions !== "Follow prescription instructions" && existing.instructions === "Follow prescription instructions") {
          existing.instructions = instructions;
        }
      } else {
        results.push({
          name,
          dosage,
          frequency,
          since: duration,
          duration,
          instructions,
          timesPerDay,
        });
      }
    }
  }

  return results;
}

function mergeMedicationItems(
  structured: MedicationRecord[],
  extracted: Synthesis["medications"],
): Synthesis["medications"] {
  const merged: Synthesis["medications"] = [];
  for (const medication of [...structured, ...extracted]) {
    const existing = merged.find(
      (item) => item.name.toLowerCase() === medication.name.toLowerCase(),
    );
    if (!existing) {
      merged.push({ ...medication, since: medication.since || medication.duration || "As directed" });
      continue;
    }
    if (existing.dosage === "As directed" && medication.dosage !== "As directed") existing.dosage = medication.dosage;
    if (existing.frequency === "As directed" && medication.frequency !== "As directed") existing.frequency = medication.frequency;
    if (existing.since === "As directed" && medication.since !== "As directed") existing.since = medication.since;
    if (!existing.duration && medication.duration) existing.duration = medication.duration;
    if (!existing.instructions && medication.instructions) existing.instructions = medication.instructions;
    if (!existing.timesPerDay && medication.timesPerDay) existing.timesPerDay = medication.timesPerDay;
  }
  return merged;
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
