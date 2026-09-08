import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  FileStack,
  FileText,
  Languages,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { DOC_TYPE_DISTRIBUTION, INTAKE_SERIES } from "@/lib/clinical/data";
import { useClinicalStore } from "@/lib/clinical/store";

export function DashboardView() {
  const { docs, cases, reportsGenerated, synthesis, setView } = useClinicalStore();
  const pages = docs.reduce((a, d) => a + d.pages, 0);

  const [ticks, setTicks] = useState(0);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSyncing(true);
      setTicks((t) => t + 1);
      window.setTimeout(() => setSyncing(false), 900);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const processedPages = 14820 + pages + ticks * 3;
  const accuracy = (88.6 + ((ticks % 5) - 2) * 0.1).toFixed(1);

  const metrics = [
    {
      label: "Total reports generated",
      value: String(reportsGenerated),
      hint: "completed clinical reports",
      icon: FileText,
    },
    {
      label: "Active patient workspaces",
      value: String(cases.length),
      hint: "cases available for review",
      icon: ShieldCheck,
    },
    {
      label: "Total intake pages processed",
      value: processedPages.toLocaleString("en-GB"),
      hint: `${docs.length} document(s) · ${pages} page(s) in this session`,
      icon: FileStack,
    },
    {
      label: "Record review confidence",
      value: `${accuracy}%`,
      hint: "combined recognition and translation",
      icon: Languages,
    },
    {
      label: "Current case risk",
      value: synthesis?.risk ?? "—",
      hint: synthesis ? `case ${synthesis.caseId}` : "no active clinical summary",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
             Clinical overview
          </p>
           <h2 className="text-2xl font-semibold text-foreground">Patient records overview</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
             A clear view of current cases, record volumes, review status, and clinical risk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-mono-xs transition-colors",
              syncing ? "bg-success/10 text-success" : "text-muted-foreground",
            )}
          >
            <span
              className={cn("size-2 rounded-full bg-success", syncing && "animate-ping")}
            />
             {syncing ? "Updating…" : "Records current"}
          </span>
          <Button variant="outline" onClick={() => setView("intake")}>
             <FileStack className="mr-2 size-4" /> Import records
          </Button>
          <Button onClick={() => setView("ocr")}>
             <ScanSearch className="mr-2 size-4" /> Process records
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                {m.label}
              </p>
              <m.icon className="size-4 shrink-0 text-navy" />
            </div>
            <p className="font-serif text-2xl leading-none text-foreground">{m.value}</p>
            <p className="text-mono-xs text-muted-foreground">{m.hint}</p>
          </div>
        ))}
      </section>


      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">Intake trend</h3>
              <p className="text-mono-xs text-muted-foreground">weekly vs monthly document flow</p>
            </div>
            <TrendingUp className="size-4 text-navy" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={INTAKE_SERIES}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weekly"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="monthly"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">Document type distribution</h3>
               <p className="text-mono-xs text-muted-foreground">records grouped by clinical type</p>
            </div>
            <Languages className="size-4 text-navy" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DOC_TYPE_DISTRIBUTION}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="type"
                  stroke="var(--color-muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-foreground)",
                  }}
                />
                <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-4 text-navy" />
           <h3 className="font-serif text-lg text-foreground">Review progress</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "Step 1", label: "Document intake", done: docs.length > 0 },
             { step: "Step 2", label: "Processing & translation", done: useReadiness("ocr") },
             { step: "Step 3", label: "Clinical summary & timeline", done: useReadiness("synthesis") },
            { step: "Step 4", label: "Evaluation report", done: useReadiness("report") },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-md border border-border bg-surface px-3 py-3 text-sm"
            >
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                {s.step}
              </p>
              <p className="mt-1 text-foreground">{s.label}</p>
              <p
                className={
                  s.done ? "mt-1 text-mono-xs text-success" : "mt-1 text-mono-xs text-warning"
                }
              >
                {s.done ? "complete" : "pending"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function useReadiness(key: "ocr" | "synthesis" | "report") {
  const { ocrComplete, synthesis, reportReady } = useClinicalStore();
  if (key === "ocr") return ocrComplete;
  if (key === "synthesis") return Boolean(synthesis);
  return reportReady;
}
