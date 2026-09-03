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

  const metrics = [
    {
      label: "Documents in intake",
      value: String(docs.length),
      hint: `${pages} rasterised page(s) staged`,
      icon: FileStack,
    },
    {
      label: "Case assets persisted",
      value: String(cases.length),
      hint: "uuid primary key rows committed",
      icon: ShieldCheck,
    },
    {
      label: "Reports generated",
      value: String(reportsGenerated),
      hint: "cumulative evaluation reports",
      icon: FileText,
    },
    {
      label: "Current case risk",
      value: synthesis?.risk ?? "—",
      hint: synthesis ? `case ${synthesis.caseId}` : "no synthesis in session",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
            operational overview
          </p>
          <h2 className="font-serif text-2xl text-foreground">Synthesis pipeline dashboard</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Intake volumes, document-type distribution and pipeline readiness across the current
            analyst session. All figures are derived from persisted session state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setView("intake")}>
            <FileStack className="mr-2 size-4" /> Go to intake
          </Button>
          <Button onClick={() => setView("ocr")}>
            <ScanSearch className="mr-2 size-4" /> Run pipeline
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">
                {m.label}
              </p>
              <m.icon className="size-4 text-navy" />
            </div>
            <p className="font-serif text-3xl leading-none text-foreground">{m.value}</p>
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
              <p className="text-mono-xs text-muted-foreground">auto-classifier output totals</p>
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
          <h3 className="font-serif text-lg text-foreground">Pipeline readiness</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "Step 1", label: "Document intake", done: docs.length > 0 },
            { step: "Step 2", label: "OCR & translation", done: useReadiness("ocr") },
            { step: "Step 3", label: "Synthesis & timeline", done: useReadiness("synthesis") },
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
