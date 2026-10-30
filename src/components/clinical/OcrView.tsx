import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
<<<<<<< HEAD
import { Languages, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ClinicalDoc, MedicationRecord } from "@/lib/clinical/data";
import { newCaseId, useClinicalStore } from "@/lib/clinical/store";


export function OcrView() {
  const { docs, ocrComplete, updateDoc, markOcrComplete, buildSynthesis, setView, openCase, beginBatch, endBatch, takeQueued, getDocs, batchActive, activeCaseId, queuedBatches, assignDocsToCase, processingCaseId, processingDocName, processingProgress, processingStatus, setProcessingState } = useClinicalStore();
  const runningRef = useRef(false);
  const runRef = useRef<(() => Promise<void>) | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(processingProgress || (ocrComplete ? 100 : 0));
  const [active, setActive] = useState<string | null>(processingDocName);
  const [status, setStatus] = useState(processingStatus);
=======
import { Languages, Play, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ClinicalDoc } from "@/lib/clinical/data";
import { useClinicalStore } from "@/lib/clinical/store";


export function OcrView() {
  const { docs, ocrComplete, updateDoc, markOcrComplete, setView, beginBatch, endBatch, takeQueued, getDocs, batchActive } = useClinicalStore();
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(ocrComplete ? 100 : 0);
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState("Waiting to process records");
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
  const [statusTick, setStatusTick] = useState(0);
  
  const [selected, setSelected] = useState<string | null>(docs[0]?.id ?? null);
  const apiBase = import.meta.env["VITE_API_BASE_URL"] ?? "/api";

<<<<<<< HEAD
  const updateProgress = (value: number) => {
    setProgress(value);
    setProcessingState({ processingProgress: value });
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setProcessingState({ processingStatus: value });
  };

  const updateActive = (value: string | null) => {
    setActive(value);
    setProcessingState({ processingDocName: value });
  };

  useEffect(() => {
    setProgress(processingProgress || (ocrComplete ? 100 : 0));
    setActive(processingDocName);
    setStatus(processingStatus);
  }, [processingProgress, processingDocName, processingStatus, ocrComplete]);

=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setStatusTick((tick) => (tick + 1) % 4), 3000);
    return () => window.clearInterval(id);
  }, [running]);

<<<<<<< HEAD
  const processIds = async (ids: string[], caseId: string) => {
    let failed = 0;
    const total = ids.length;
    const setBatchProgress = (index: number, documentProgress: number) => {
      updateProgress(Math.round(((index + documentProgress / 100) / total) * 100));
    };
=======
  const processIds = async (ids: string[]) => {
    let failed = 0;
    const total = ids.length;
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
    for (let i = 0; i < total; i++) {
      // Read the live store so documents queued after this loop started are found too.
      const doc = getDocs().find((d) => d.id === ids[i]);
      if (!doc) continue;
<<<<<<< HEAD
      updateActive(doc.name);
      setBatchProgress(i, 5);
      updateStatus("Retrieving the text");
      if (doc.sourceFile instanceof File) {
        const formData = new FormData();
        formData.append("file", doc.sourceFile);
        formData.append("case_id", caseId);
        formData.append("document_id", doc.id);
        try {
          const response = await fetch(`${apiBase}/process-document`, { method: "POST", body: formData });
          if (!response.ok) {
            const detail = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${detail.slice(0, 240)}`);
          }
          setBatchProgress(i, 35);
          updateStatus("Rasterizing and recognizing the text");
=======
      setActive(doc.name);
      setProgress(5);
      setStatus("Retrieving the text");
      if (doc.sourceFile instanceof File) {
        const formData = new FormData();
        formData.append("file", doc.sourceFile);
        try {
          const response = await fetch(`${apiBase}/process-document`, { method: "POST", body: formData });
          if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
          setProgress(35);
          setStatus("Rasterizing and recognizing the text");
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
          const result = (await response.json()) as {
            language_detected?: string;
            classification?: string;
            classifier_confidence?: number;
            patient_name?: string;
            fields?: Record<string, string>;
            ocr_text?: string;
            translated_text?: string;
            pages?: number;
            ocr_confidence?: number;
            translation_quality?: number;
<<<<<<< HEAD
            medications?: MedicationRecord[];
=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
          };
          updateDoc(doc.id, {
            language: formatLanguage(result.language_detected),
            classification: result.classification as any,
            classifierConfidence: result.classifier_confidence ?? 0,
            ...(result.patient_name ? { patientName: result.patient_name } : {}),
            ...(result.fields ? { fields: result.fields } : {}),
<<<<<<< HEAD
            ...(result.medications ? { medications: result.medications } : {}),
=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
            pages: result.pages ?? 1,
            ocrConfidence: result.ocr_confidence ?? 0,
            translationQuality: result.translation_quality ?? 0,
            originalText: result.ocr_text ?? "",
            translatedText: result.translated_text ?? "",
            processing: false,
            analyzed: true,
          });
<<<<<<< HEAD
          setBatchProgress(i, 92);
          updateStatus("Translating the text. This will take a few minutes");
          await wait(160);
          setBatchProgress(i, 100);
=======
          setProgress(92);
          setStatus("Translating the text. This will take a few minutes");
          await wait(160);
          setProgress(100);
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
        } catch (error) {
          console.error("Document processing failed", error);
          failed += 1;
          updateDoc(doc.id, { processing: false, analyzed: false, processed: false });
<<<<<<< HEAD
          setBatchProgress(i, 100);
          toast.error(`${doc.name} processing failed`, {
            description: error instanceof Error ? error.message : "OCR or translation failed.",
          });
        }
      } else if (doc.origin === "sample") {
        setBatchProgress(i, 35);
        updateStatus("Rasterizing and recognizing the text");
        await wait(180);
        setBatchProgress(i, 92);
        updateStatus("Translating the text. This will take a few minutes");
        await wait(180);
        setBatchProgress(i, 100);
      } else {
        failed += 1;
        updateDoc(doc.id, { processing: false, analyzed: false });
        setBatchProgress(i, 100);
      }
      if (i < total - 1) updateStatus("Retrieving the text");
=======
        }
      } else if (doc.origin === "sample") {
        setProgress(35);
        setStatus("Rasterizing and recognizing the text");
        await wait(180);
        setProgress(92);
        setStatus("Translating the text. This will take a few minutes");
        await wait(180);
        setProgress(100);
      } else {
        failed += 1;
        updateDoc(doc.id, { processing: false, analyzed: false });
      }
      if (i < total - 1) {
        setProgress(0);
        setStatus("Retrieving the text");
      }
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
    }
    return failed;
  };

  const run = async () => {
    // batchActive also covers a queue drain still running from another mount of this view.
    if (!getDocs().length || runningRef.current || batchActive) return;
    runningRef.current = true;
    setRunning(true);
<<<<<<< HEAD
    updateProgress(0);
    updateStatus("Retrieving the text");
    // Isolated batch: uploads arriving while this runs join the queue, never this stream.
    const queuedIds = new Set(queuedBatches.flatMap((batch) => batch.docIds));
    const currentCaseId = activeCaseId ?? newCaseId();
    const initialIds = getDocs()
      .filter((doc) => !queuedIds.has(doc.id))
      .filter((doc) => activeCaseId ? doc.caseId === currentCaseId : !doc.caseId)
      .map((doc) => doc.id);
    let finalCaseId = currentCaseId;
    setProcessingState({ processingCaseId: currentCaseId, processingDocName: null });
    assignDocsToCase(initialIds, currentCaseId);
    beginBatch();
    let failed = await processIds(initialIds, currentCaseId);
    markOcrComplete(currentCaseId);
    const completedCase = buildSynthesis(currentCaseId);
    toast.success(`${completedCase.patientName} documents processed`, {
      description: `${initialIds.length} document(s) completed.`,
    });
    // Sequentially process each independently queued patient batch.
    for (;;) {
      const next = takeQueued();
      if (!next) break;
      toast.info("Starting next queued patient", {
        description: "The next patient batch will be processed separately.",
      });
      setProcessingState({ processingCaseId: next.caseId, processingDocName: null });
      updateProgress(0);
      updateStatus("Processing queued records");
      assignDocsToCase(next.docIds, next.caseId);
      failed += await processIds(next.docIds, next.caseId);
      markOcrComplete(next.caseId);
      const completedQueuedCase = buildSynthesis(next.caseId);
      toast.success(`${completedQueuedCase.patientName} documents processed`, {
        description: `${next.docIds.length} document(s) completed.`,
      });
      finalCaseId = next.caseId;
    }
    endBatch();
    runningRef.current = false;
    setRunning(false);
    updateActive(null);
    const total = initialIds.length;
    updateStatus(failed ? "Some records need to be processed again" : "All records processed");
    setProcessingState({ processingCaseId: null });
=======
    setProgress(0);
    setStatus("Retrieving the text");
    // Isolated batch: uploads arriving while this runs join the queue, never this stream.
    beginBatch();
    let failed = await processIds(getDocs().map((d) => d.id));
    // Sequentially auto-process records queued while the batch was running.
    for (;;) {
      const next = takeQueued();
      if (!next.length) break;
      setStatus("Processing queued records");
      failed += await processIds(next);
    }
    endBatch();
    markOcrComplete();
    runningRef.current = false;
    setRunning(false);
    setActive(null);
    const total = getDocs().length;
    setStatus(failed ? "Some records need to be processed again" : "All records processed");
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
    setSelected((s) => s ?? getDocs()[0]?.id ?? null);
    if (failed) {
      toast.error("Some records could not be processed", {
        description: `${failed} of ${total} record(s) failed retrieval or analysis. No fallback text was used.`,
      });
    } else {
      toast.success("Records processed and translated", {
<<<<<<< HEAD
        description: `${total} record(s) are ready for clinical review. Queued patient batches were processed separately.`,
      });
      openCase(finalCaseId);
      setView("synthesis");
    }
  };

  runRef.current = run;

  useEffect(() => {
    if (docs.length > 0 && !ocrComplete && !running && !batchActive && !runningRef.current) {
      void runRef.current?.();
    }
  }, [docs.length, ocrComplete, running, batchActive]);

  const activeDocs = activeCaseId
    ? docs.filter((doc) => doc.caseId === activeCaseId)
    : docs.filter((doc) => !doc.caseId);
  const current: ClinicalDoc | undefined =
    activeDocs.find((d) => d.id === selected) ?? activeDocs[0];
  const isSampleCase =
    activeDocs.length > 0 &&
    activeDocs.every(
=======
        description: `${total} record(s) are ready for clinical review.`,
      });
    }
  };

  const current: ClinicalDoc | undefined =
    docs.find((d) => d.id === selected) ?? docs[0];
  const isSampleCase =
    docs.length > 0 &&
    docs.every(
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      (doc) => doc.origin === "sample" || /_(TA|TE|ES|HI|EN)_/i.test(doc.name),
    );
  const hasActualAnalysis = current?.origin === "sample" || current?.analyzed === true;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 2</p>
           <h2 className="text-2xl font-semibold text-foreground">Processing &amp; translating medical records</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
             Review scanned records, recognise medical details, and prepare clear English clinical text.
          </p>
        </div>
<<<<<<< HEAD
        <Button variant="outline" disabled={!ocrComplete} onClick={() => setView("synthesis")}>
          Continue to synthesis
        </Button>
=======
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={running || docs.length === 0}>
            <Play className="mr-2 size-4" />
             {running ? "Processing…" : ocrComplete ? "Process again" : "Process records"}
          </Button>
          <Button variant="outline" disabled={!ocrComplete} onClick={() => setView("synthesis")}>
            Continue to synthesis
          </Button>
        </div>
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      </section>

      {docs.length === 0 ? (
        <section className="panel p-10 text-center">
          <ScanSearch className="mx-auto size-8 text-navy" />
          <p className="mt-3 text-sm text-muted-foreground">
             No records have been added. Return to Import Records to upload or load the sample case.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setView("intake")}>
            Go to intake
          </Button>
        </section>
      ) : (
        <>
          <section className="panel space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-mono-xs text-muted-foreground">
                {active
                  ? `${["Retrieving the text", "Rasterizing and recognizing the text", "Translating the text. This will take a few minutes"][statusTick % 3]}${".".repeat(statusTick)} · ${active}`
                  : status}
              </p>
              <p className="text-mono-xs text-muted-foreground">{progress}%</p>
            </div>
            <Progress value={progress} />
          </section>

<<<<<<< HEAD
          {queuedBatches.length > 0 && (
            <section className="panel space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">Queued patient batches</p>
                <span className="text-mono-xs text-warning">{queuedBatches.length} waiting</span>
              </div>
              {queuedBatches.map((batch, index) => (
                <p key={batch.caseId} className="text-sm text-foreground">
                  Queue {index + 1}: {batch.docIds.map((id) => docs.find((doc) => doc.id === id)?.name ?? "Document").join(", ")}
                </p>
              ))}
            </section>
          )}

          <section className="panel overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
              <Languages className="size-4 text-navy" />
              <h3 className="font-serif text-lg text-foreground">Extraction details</h3>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {activeDocs.map((d) => (
=======
          <section className="panel overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
              <Languages className="size-4 text-navy" />
              <h3 className="font-serif text-lg text-foreground">Extraction comparison</h3>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {docs.map((d) => (
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
                  <Button
                    key={d.id}
                    size="sm"
                    variant={current?.id === d.id ? "default" : "outline"}
                    className={
                      current?.id === d.id
                        ? "text-primary-foreground"
                        : "text-mono-xs"
                    }
                    onClick={() => setSelected(d.id)}
                  >
                    {isSampleCase ? d.language.split(" ")[0] : d.name}
                  </Button>
                ))}
              </div>
            </header>

            {current && (
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-mono-xs">
                    {hasActualAnalysis ? current.classification : "Awaiting document analysis"}
                  </Badge>
                  <span className="text-mono-xs text-muted-foreground">{current.name}</span>
                  {hasActualAnalysis && current.patientName && (
                    <span className="text-mono-xs text-foreground">
                      patient: {current.patientName}
                    </span>
                  )}
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-mono-xs text-success">
                     {hasActualAnalysis ? `recognition ${current.ocrConfidence}%` : "OCR pending"}
                  </span>
                  <span className="rounded-full bg-navy/10 px-2 py-0.5 text-mono-xs text-navy">
                    {hasActualAnalysis ? `translation ${current.translationQuality}%` : "translation pending"}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title={`Original scan text — ${current.language}`}>
                    {hasActualAnalysis ? current.originalText : "Waiting for rasterization and OCR..."}
                  </Panel>
                  <Panel title="Formal English clinical text">
                    {hasActualAnalysis ? current.translatedText : "Waiting for English translation..."}
                  </Panel>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatLanguage(code?: string) {
  const names: Record<string, string> = { hi: "Hindi", ta: "Tamil", te: "Telugu", en: "English", es: "Spanish" };
  return names[code?.toLowerCase() ?? ""] ?? code ?? "Unknown";
}

function Panel({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-md border border-border bg-surface">
      <p className="border-b border-border px-3 py-2 text-mono-xs uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
<<<<<<< HEAD
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap wrap-break-word px-3 py-3 text-xs leading-relaxed text-foreground">
=======
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-xs leading-relaxed text-foreground">
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
        {children}
      </pre>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
