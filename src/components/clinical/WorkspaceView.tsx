import { Briefcase, Database, FileCheck2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClinicalStore } from "@/lib/clinical/store";

const RISK_STYLES: Record<string, string> = {
  STABLE: "bg-success/15 text-success",
  "ACTION REQUIRED": "bg-warning/20 text-warning-foreground",
  "CRITICAL RISK": "bg-destructive/15 text-destructive",
};

export function WorkspaceView() {
  const { cases, docs, synthesis, reportReady, setView } = useClinicalStore();

  const slots = [
    {
      name: "asset_slot(raw_documents)",
      count: docs.length,
      note: "uploaded artefacts with uuid primary keys",
    },
    {
      name: "asset_slot(translated_text)",
      count: docs.filter((d) => d.processed).length,
      note: "formal English clinical text rows",
    },
    {
      name: "asset_slot(synthesis)",
      count: synthesis ? 1 : 0,
      note: "resolved entity + timeline document",
    },
    {
      name: "asset_slot(evaluation_report)",
      count: reportReady ? 1 : 0,
      note: "exportable executive report",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
            workspace
          </p>
          <h2 className="font-serif text-2xl text-foreground">Cases &amp; persisted assets</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every synthesised case is committed to the session persistence layer with a unique case
            identifier. Asset slots mirror the simulated PostgreSQL schema.
          </p>
        </div>
        <Button variant="outline" onClick={() => setView("intake")}>
          <Briefcase className="mr-2 size-4" /> New intake
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {slots.map((s) => (
          <div key={s.name} className="panel space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-mono-xs text-muted-foreground">{s.name}</p>
              <Database className="size-4 text-navy" />
            </div>
            <p className="font-serif text-3xl leading-none text-foreground">{s.count}</p>
            <p className="text-mono-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-border px-5 py-3">
          <h3 className="font-serif text-lg text-foreground">Case register</h3>
          <p className="text-mono-xs text-muted-foreground">
            {cases.length} persisted case row(s)
          </p>
        </header>
        {cases.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No cases yet. Complete a synthesis to register the first case asset.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {cases.map((c) => (
              <li key={c.caseId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{c.patientName}</p>
                  <p className="text-mono-xs text-muted-foreground">
                    {c.caseId} · {new Date(c.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-mono-xs">
                  {c.docCount} docs · {c.pages}p
                </Badge>
                <span className={cn("rounded-full px-2.5 py-0.5 text-mono-xs", RISK_STYLES[c.risk])}>
                  {c.risk}
                </span>
                <span className="inline-flex items-center gap-1 text-mono-xs text-muted-foreground">
                  {c.hasReport ? (
                    <>
                      <FileCheck2 className="size-3.5 text-success" /> report ready
                    </>
                  ) : (
                    <>
                      <FileText className="size-3.5" /> no report
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
