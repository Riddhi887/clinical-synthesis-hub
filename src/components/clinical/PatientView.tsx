import { useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardList,
  FileOutput,
  FileStack,
  FileText,
  FolderOpen,
  FolderPlus,
  Languages,
  Plus,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClinicalStore, type PatientFolder } from "@/lib/clinical/store";

const formatDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export function PatientView() {
  const { folders, activeCaseId, openCase, closeCase, startNewCase } = useClinicalStore();
  const folder = activeCaseId ? folders[activeCaseId] : undefined;

  if (folder) return <PatientHub folder={folder} onClose={closeCase} />;

  const caseList = Object.values(folders).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">patient folders</p>
          <h2 className="text-2xl font-semibold text-foreground">Patient cases &amp; records</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every case keeps its own records, translations, summaries, and reports — fully separated
            from other patients.
          </p>
        </div>
        <Button onClick={startNewCase}>
          <FolderPlus className="mr-2 size-4" /> Start a new case
        </Button>
      </section>

      <section className="panel overflow-hidden">
        <header className="flex items-center gap-2 border-b border-border px-5 py-3">
          <FolderOpen className="size-4 text-navy" />
          <h3 className="font-serif text-lg text-foreground">All patient folders</h3>
          <span className="ml-auto text-mono-xs text-muted-foreground">{caseList.length} case(s)</span>
        </header>
        {caseList.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No patient cases yet. Complete the record workflow, or start a new case.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {caseList.map((f) => (
              <li key={f.caseId} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/10 text-navy">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{f.patientName}</p>
                  <p className="text-mono-xs text-muted-foreground">
                    Case {f.caseId} · MRN {f.mrn} · {f.docs.length} record(s) · opened {formatDate(f.createdAt)}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn("text-mono-xs", f.risk === "STABLE" ? "text-success" : "text-warning")}
                >
                  {f.risk === "STABLE" ? "Stable" : "Action required"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openCase(f.caseId)}>
                  View patient folder
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PatientHub({ folder, onClose }: { folder: PatientFolder; onClose: () => void }) {
  const { addFiles, setView } = useClinicalStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const n = addFiles(
      Array.from(files).map((file) => ({
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        sourceFile: file,
      })),
    );
    toast.success(`${n} record(s) added to ${folder.patientName}'s folder`, {
      description: "Open Process & Translation to retrieve and translate them.",
    });
  };

  const reviewed = folder.docs.filter((d) => d.analyzed);
  const translated = folder.docs.filter((d) => d.translatedText.trim());

  const cards = [
    { label: "Imported records", value: folder.docs.length, icon: FileStack },
    { label: "Reviewed records", value: reviewed.length, icon: ClipboardList },
    { label: "Clinical summaries", value: folder.synthesis ? 1 : 0, icon: Languages },
    { label: "Executive reports", value: folder.reportReady ? 1 : 0, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="ghost" size="icon" className="mt-0.5 size-8 shrink-0" onClick={onClose} aria-label="Back to patient cases">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 space-y-1">
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">patient asset hub</p>
              <h2 className="text-2xl font-semibold text-foreground">{folder.patientName}</h2>
              <p className="text-mono-xs text-muted-foreground">
                Case {folder.caseId} · MRN {folder.mrn} · folder opened {formatDate(folder.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              <Plus className="mr-2 size-4" /> Add documents
            </Button>
            <Button onClick={() => setView("ocr")}>Open record workflow</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <c.icon className="size-4 shrink-0 text-navy" />
            </div>
            <p className="font-serif text-2xl leading-none text-foreground">{c.value}</p>
            <p className="text-mono-xs text-muted-foreground">in this patient folder</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Slot title="Source records" hint="Raw intake — uploaded scans and reports" count={folder.docs.length}>
          {folder.docs.length === 0 ? (
            <SlotEmpty message="No source records in this folder yet." />
          ) : (
            folder.docs.map((d) => (
              <AssetRow
                key={d.id}
                name={d.name}
                meta={`Record ID ${d.id.slice(0, 8).toUpperCase()} · ${d.pages} page(s) · ${d.sizeKb} KB · uploaded ${formatDate(d.uploadedAt)}`}
                status={d.analyzed ? "Processed" : d.processing ? "Processing" : "Pending"}
              />
            ))
          )}
        </Slot>

        <Slot title="Translated & processed records" hint="Clear English clinical text" count={translated.length}>
          {translated.length === 0 ? (
            <SlotEmpty message="Processing has not produced translations yet." />
          ) : (
            translated.map((d) => (
              <AssetRow
                key={d.id}
                name={d.name}
                meta={`${d.language || "Unknown language"} · ${d.pages} page(s) · translation quality ${d.translationQuality || "—"}%`}
                status="Processed"
              />
            ))
          )}
        </Slot>

        <Slot title="Summaries & timeline assets" hint="Structured clinical findings for this case" count={folder.synthesis ? folder.synthesis.timeline.length : 0}>
          {folder.synthesis ? (
            folder.synthesis.timeline.map((t) => (
              <AssetRow
                key={t.id}
                name={t.title}
                meta={`${t.date} · ${t.facility}`}
                status="Summarized"
              />
            ))
          ) : (
            <SlotEmpty message="No clinical summary generated yet for this case." />
          )}
        </Slot>

        <Slot title="Formal executive reports" hint="Hospital reports ready for PDF / Word export" count={folder.reportReady ? 1 : 0}>
          {folder.reportReady ? (
            <div className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                  Executive Medical Report — {folder.patientName}
                </p>
                <Badge variant="secondary" className="text-mono-xs text-success">Ready for export</Badge>
              </div>
              <p className="text-mono-xs text-muted-foreground">
                Generated {formatDate(folder.synthesis?.createdAt)} · case {folder.caseId}
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setView("report")}>
                <FileOutput className="mr-2 size-4" /> Open report
              </Button>
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                  No report generated yet
                </p>
                <Badge variant="secondary" className="text-mono-xs text-warning">Pending</Badge>
              </div>
              <p className="text-mono-xs text-muted-foreground">
                Complete the record workflow to generate the formal report.
              </p>
              {folder.synthesis && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setView("report")}>
                  <FileOutput className="mr-2 size-4" /> Go to report
                </Button>
              )}
            </div>
          )}
        </Slot>
      </section>
    </div>
  );
}

function Slot({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-navy/10 text-navy">
          <FolderOpen className="size-4" />
        </span>
        <div className="min-w-0">
          <h4 className="truncate font-serif text-base text-foreground">{title}</h4>
          <p className="truncate text-mono-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-navy/10 px-2 py-0.5 text-mono-xs text-navy">
          {count}
        </span>
      </header>
      <div className="flex-1 divide-y divide-border">{children}</div>
    </div>
  );
}

function AssetRow({
  name,
  meta,
  status,
}: {
  name: string;
  meta: string;
  status: string;
}) {
  const done = status === "Processed" || status === "Summarized" || status === "Ready for export";
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</p>
        <Badge
          variant="secondary"
          className={cn("text-mono-xs", done ? "text-success" : "text-warning")}
        >
          {status}
        </Badge>
      </div>
      <p className="text-mono-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function SlotEmpty({ message }: { message: string }) {
  return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{message}</p>;
}
