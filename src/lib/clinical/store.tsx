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
  SYNTHESIS_BASE,
  classifyFile,
  detectLanguage,
  genericOriginal,
  genericTranslated,
  ocrRange,
  type ClinicalDoc,
  type Synthesis,
} from "./data";

export type ViewKey =
  | "dashboard"
  | "workspace"
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
}

const STORAGE_KEY = "chss.session.v1";

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
  reportsGenerated: 128,
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
  addFiles: (names: { name: string; sizeKb: number }[]) => number;
  loadSampleCase: () => void;
  removeDoc: (id: string) => void;
  clearIntake: () => void;
  appendLog: (line: string) => void;
  finishOcr: (docs: ClinicalDoc[]) => void;
  buildSynthesis: () => Synthesis;
  markReportReady: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function ClinicalStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  // Hydrate from persisted session (LocalStorage persistence layer).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState({ ...initialState, ...parsed });
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
          const { classification, confidence } = classifyFile(f.name);
          const language = detectLanguage(f.name);
          const { ocrConfidence, translationQuality } = ocrRange(f.name);
          return {
            id: newUuid(),
            name: f.name,
            language,
            pages: 1 + (f.name.length % 5),
            sizeKb: f.sizeKb,
            classification,
            classifierConfidence: confidence,
            originalText: genericOriginal(f.name, language),
            translatedText: genericTranslated(f.name, classification),
            ocrConfidence,
            translationQuality,
            processed: false,
          };
        });
        patch((s) => ({
          docs: [...s.docs, ...created],
          ocrComplete: false,
          reportReady: false,
        }));
        return created.length;
      },
      loadSampleCase: () => {
        const created: ClinicalDoc[] = SAMPLE_CASE.map((d) => ({
          ...d,
          id: newUuid(),
          processed: false,
        }));
        patch({ docs: created, ocrComplete: false, reportReady: false, synthesis: null, logs: [] });
      },
      removeDoc: (id) =>
        patch((s) => ({ docs: s.docs.filter((d) => d.id !== id), reportReady: false })),
      clearIntake: () =>
        patch({ docs: [], logs: [], ocrComplete: false, synthesis: null, reportReady: false }),
      // Developer-only telemetry: routed to the browser console, never to the UI.
      appendLog: (line) => {
        const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
        console.info(`[clinical-pipeline ${ts}] ${line}`);
      },
      finishOcr: (docs) => patch({ docs, ocrComplete: true }),
      buildSynthesis: () => {
        let result!: Synthesis;
        setState((s) => {
          const existing = s.synthesis;
          const synthesis: Synthesis =
            existing ??
            ({
              ...SYNTHESIS_BASE,
              caseId: newCaseId(),
              createdAt: Date.now(),
            } satisfies Synthesis);
          result = synthesis;
          const pages = s.docs.reduce((a, d) => a + d.pages, 0);
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
        patch((s) => ({
          reportReady: true,
          reportsGenerated: s.reportReady ? s.reportsGenerated : s.reportsGenerated + 1,
          cases: s.cases.map((c) =>
            c.caseId === s.synthesis?.caseId ? { ...c, hasReport: true } : c,
          ),
        })),
    };
  }, [state, hydrated, patch]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useClinicalStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useClinicalStore must be used inside ClinicalStoreProvider");
  return ctx;
}
