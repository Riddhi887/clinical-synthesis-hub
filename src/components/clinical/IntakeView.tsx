import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileStack, FolderOpen, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";

export function IntakeView() {
  const { docs, addFiles, loadSampleCase, removeDoc, clearIntake, setView } = useClinicalStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const ingest = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const payload = Array.from(files).map((f) => ({
      name: f.name,
      sizeKb: Math.max(1, Math.round(f.size / 1024)),
    }));
    const n = addFiles(payload);
    toast.success(`${n} document(s) staged`, {
      description: "Auto-classified and committed to asset_slot(raw_documents).",
    });
  };

  const pages = docs.reduce((a, d) => a + d.pages, 0);
  const sizeMb = (docs.reduce((a, d) => a + d.sizeKb, 0) / 1024).toFixed(2);

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">step 1</p>
          <h2 className="font-serif text-2xl text-foreground">Document intake</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Bulk-upload scanned prescriptions, discharge summaries, laboratory panels, surgical notes
            and imaging reports. Each artefact is auto-classified on ingest and assigned a UUID
            primary key in the simulated persistence layer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadSampleCase}>
            <FolderOpen className="mr-2 size-4" /> Load sample case
          </Button>
          <Button disabled={docs.length === 0} onClick={() => setView("ocr")}>
            Continue to OCR
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
            <h3 className="font-serif text-lg text-foreground">Staged artefacts</h3>
            <p className="text-mono-xs text-muted-foreground">
              {docs.length} document(s) · {pages} page(s) · {sizeMb} MB
            </p>
          </div>
          {docs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearIntake();
                toast.info("Intake cleared", { description: "All staged asset rows dropped." });
              }}
            >
              <Trash2 className="mr-2 size-4" /> Clear intake
            </Button>
          )}
        </header>

        {docs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No documents staged. Upload files or load the sample multilingual case.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{d.name}</p>
                  <p className="text-mono-xs text-muted-foreground">
                    uuid {d.id} · {d.language} · {d.pages}p · {d.sizeKb} KB
                  </p>
                </div>
                <Badge variant="secondary" className="text-mono-xs">
                  {d.classification}
                </Badge>
                <span className="text-mono-xs text-muted-foreground">
                  classifier {d.classifierConfidence}%
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
    </div>
  );
}
