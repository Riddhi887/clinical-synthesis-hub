import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileStack, FolderOpen, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";

export function IntakeView() {
<<<<<<< HEAD
  const { docs, addFiles, loadSampleCase, removeDoc, clearIntake, setView, batchActive, queuedBatches, processingCaseId } = useClinicalStore();
  const stagedDocs = docs.filter((doc) => !doc.analyzed && !doc.processed && doc.caseId !== processingCaseId);
  const queuedDocIds = new Set(queuedBatches.flatMap((batch) => batch.docIds));
=======
  const { docs, addFiles, loadSampleCase, removeDoc, clearIntake, setView, batchActive, queuedDocIds } = useClinicalStore();
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const ingest = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const n = addFiles(
      selectedFiles.map((file) => ({
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        sourceFile: file,
      })),
    );
    if (batchActive) {
      toast.info(`${n} document(s) queued`, {
        description:
          "A batch is currently processing. These records will be handled automatically when it finishes.",
      });
    } else {
      toast.success(`${n} document(s) staged`, {
        description: "Records are staged. Open Process & Translation to retrieve and translate them.",
      });
    }
  };

<<<<<<< HEAD
  const pages = stagedDocs.reduce((a, d) => a + d.pages, 0);
  const sizeMb = (stagedDocs.reduce((a, d) => a + d.sizeKb, 0) / 1024).toFixed(2);
=======
  const pages = docs.reduce((a, d) => a + d.pages, 0);
  const sizeMb = (docs.reduce((a, d) => a + d.sizeKb, 0) / 1024).toFixed(2);
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 1</p>
           <h2 className="text-2xl font-semibold text-foreground">Import medical records</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
             Add prescriptions, discharge summaries, laboratory results, surgical notes, and imaging
             reports. Each record is organised automatically for clinical review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadSampleCase}>
            <FolderOpen className="mr-2 size-4" /> Load sample case
          </Button>
<<<<<<< HEAD
          <Button disabled={stagedDocs.length === 0} onClick={() => setView("ocr")}>
             Process docs
=======
          <Button disabled={docs.length === 0} onClick={() => setView("ocr")}>
             Continue to processing
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
          </Button>
        </div>
      </section>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          ingest(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed bg-surface px-6 py-12 text-center transition-colors",
          dragging ? "border-navy bg-accent" : "border-border",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
          className="hidden"
          onChange={(e) => {
            ingest(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="mx-auto size-8 text-navy" />
        <h3 className="mt-4 font-serif text-lg text-foreground">
          Drop scanned medical records here
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          PDF, PNG, JPG, TIFF or WEBP. Multilingual regional-language scans (Tamil, Telugu, Hindi,
          Spanish) and handwriting regions are supported.
        </p>
        <Button className="mt-5" onClick={() => inputRef.current?.click()}>
          <FileStack className="mr-2 size-4" /> Select files
        </Button>
      </section>

      <section className="panel overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div>
           <h3 className="font-serif text-lg text-foreground">Records ready for review</h3>
            <p className="text-mono-xs text-muted-foreground">
<<<<<<< HEAD
              {stagedDocs.length} document(s) · {pages ? `${pages} page(s) analyzed` : "pages analyzed in Process & Translation"} · {sizeMb} MB
              {batchActive && queuedDocIds.size > 0 ? ` · ${queuedDocIds.size} queued` : ""}
            </p>
          </div>
          {stagedDocs.length > 0 && (
=======
              {docs.length} document(s) · {pages ? `${pages} page(s) analyzed` : "pages analyzed in Process & Translation"} · {sizeMb} MB
              {batchActive && queuedDocIds.length > 0 ? ` · ${queuedDocIds.length} queued` : ""}
            </p>
          </div>
          {docs.length > 0 && (
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearIntake();
                 toast.info("Records cleared", { description: "All imported records were removed." });
              }}
            >
              <Trash2 className="mr-2 size-4" /> Clear intake
            </Button>
          )}
        </header>

<<<<<<< HEAD
        {stagedDocs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No documents staged. Upload files or review processed records in Patient Cases.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {stagedDocs.map((d) => (
=======
        {docs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No documents staged. Upload files or load the sample multilingual case.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{d.name}</p>
                  <p className="text-mono-xs text-muted-foreground">
                    Record ID {d.id} · staged for processing · {d.sizeKb} KB
                  </p>
                </div>
<<<<<<< HEAD
                {queuedDocIds.has(d.id) ? (
=======
                {queuedDocIds.includes(d.id) ? (
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
                  <Badge variant="secondary" className="text-mono-xs text-warning">
                    Queued
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-mono-xs">Ready to process</Badge>
                )}
                <span className="text-mono-xs text-muted-foreground">
                   {d.sizeKb} KB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => removeDoc(d.id)}
                  aria-label={`Remove ${d.name}`}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
<<<<<<< HEAD

      {queuedBatches.length > 0 && (
        <section className="panel space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-serif text-lg text-foreground">Queued patient batches</h3>
            <span className="text-mono-xs text-warning">{queuedBatches.length} waiting</span>
          </div>
          <div className="space-y-3">
            {queuedBatches.map((batch, index) => (
              <div key={batch.caseId} className="rounded-md border border-border bg-surface px-3 py-2">
                <p className="text-mono-xs text-muted-foreground">
                  Queue {index + 1} · {batch.caseId} · {batch.docIds.length} document(s)
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {batch.docIds.map((id) => docs.find((doc) => doc.id === id)?.name ?? "Document").join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
=======
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
    </div>
  );
}
