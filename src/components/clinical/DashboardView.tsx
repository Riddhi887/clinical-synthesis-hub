import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileStack,
  FileText,
  GitMerge,
  Languages,
  ScanSearch,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useClinicalStore } from "@/lib/clinical/store";

const DAY_MS = 86_400_000;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_LABELS: Record<string, string> = {
  "Discharge Summary": "Discharge",
  "Outpatient Prescription": "Prescription",
  "Lab Test Panel": "Lab results",
  "Surgical Note": "Surgical",
  "Diagnostic Imaging Report": "Imaging",
};

const TOOLTIP_STYLE = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-foreground)",
} as const;

export function DashboardView() {
<<<<<<< HEAD
  const { folders, synthesis, ocrComplete, reportReady, setView } =
    useClinicalStore();
  const caseFolders = Object.values(folders);
  const overviewDocs = caseFolders.length > 0 ? caseFolders.flatMap((folder) => folder.docs) : [];
  const overviewSynthesis = synthesis && caseFolders.some((folder) => folder.caseId === synthesis.caseId)
    ? synthesis
    : null;
  const overviewReports = caseFolders.filter((folder) => folder.reportReady).length;

  // Documents persisted before upload timestamps existed count as this session's intake.
  const sessionStart = useRef(Date.now());
  const pages = overviewDocs.reduce((a, d) => a + d.pages, 0);

  const processedDocs = overviewDocs.filter((doc) => doc.analyzed && doc.processed);
=======
  const { docs, reportsGenerated, synthesis, ocrComplete, reportReady, setView } =
    useClinicalStore();

  // Documents persisted before upload timestamps existed count as this session's intake.
  const sessionStart = useRef(Date.now());
  const pages = docs.reduce((a, d) => a + d.pages, 0);

  const processedDocs = docs.filter((doc) => doc.analyzed && doc.processed);
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
  const processedPages = processedDocs.reduce((total, doc) => total + doc.pages, 0);
  const accuracy = processedDocs.length
    ? (
        processedDocs.reduce(
          (total, doc) => total + (doc.ocrConfidence + doc.translationQuality) / 2,
          0,
        ) / processedDocs.length
      ).toFixed(1)
    : "—";

  const metrics = [
    {
      label: "Total reports generated",
<<<<<<< HEAD
      value: String(overviewReports),
=======
      value: String(reportsGenerated),
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      hint: "completed clinical reports",
      icon: FileText,
    },
    {
      label: "Total intake pages processed",
      value: processedPages.toLocaleString("en-GB"),
<<<<<<< HEAD
      hint: `${overviewDocs.length} document(s) · ${pages} page(s) in patient cases`,
=======
      hint: `${docs.length} document(s) · ${pages} page(s) in this session`,
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      icon: FileStack,
    },
    {
      label: "Record review confidence",
      value: accuracy === "—" ? accuracy : `${accuracy}%`,
      hint: processedDocs.length
        ? "combined recognition and translation"
        : "no processed records",
      icon: Languages,
    },
    {
      label: "Current case risk",
<<<<<<< HEAD
      value: overviewSynthesis?.risk ?? "—",
      hint: overviewSynthesis ? `case ${overviewSynthesis.caseId}` : "no active clinical summary",
=======
      value: synthesis?.risk ?? "—",
      hint: synthesis ? `case ${synthesis.caseId}` : "no active clinical summary",
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      icon: AlertTriangle,
    },
  ];

  // 1 — Intake trend: records added per day over the last 7 days, from real upload times.
  const intakeTrend = useMemo(() => {
    const today = new Date();
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      buckets.set(day.toDateString(), 0);
    }
<<<<<<< HEAD
    overviewDocs.forEach((doc) => {
=======
    docs.forEach((doc) => {
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      const key = new Date(doc.uploadedAt ?? sessionStart.current).toDateString();
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([key, count]) => ({
      day: DAY_LABELS[new Date(key).getDay()],
      records: count,
    }));
<<<<<<< HEAD
  }, [overviewDocs]);
=======
  }, [docs]);
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

  // 2 — Document type distribution, from each record's classification.
  const typeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
<<<<<<< HEAD
    overviewDocs.forEach((doc) => {
=======
    docs.forEach((doc) => {
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      const label = doc.classification ? TYPE_LABELS[doc.classification] ?? doc.classification : "Unclassified";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
<<<<<<< HEAD
  }, [overviewDocs]);
=======
  }, [docs]);
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

  // 3 — Comparison: processed records vs generated reports.
  const comparison = useMemo(
    () => [
      { name: "Records processed", value: processedDocs.length, fill: "var(--color-chart-1)" },
<<<<<<< HEAD
      { name: "Reports generated", value: overviewReports, fill: "var(--color-chart-2)" },
    ],
    [processedDocs.length, overviewReports],
=======
      { name: "Reports generated", value: reportsGenerated, fill: "var(--color-chart-2)" },
    ],
    [processedDocs.length, reportsGenerated],
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
  );

  // 4 — Processing status donut: complete vs in-progress vs queued.
  const statusData = useMemo(() => {
    let complete = 0;
    let inProgress = 0;
    let queued = 0;
<<<<<<< HEAD
    overviewDocs.forEach((doc) => {
=======
    docs.forEach((doc) => {
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
      if (doc.analyzed && doc.processed) complete += 1;
      else if (doc.analyzed || doc.processing) inProgress += 1;
      else queued += 1;
    });
    return [
      { name: "Complete", value: complete, fill: "var(--color-chart-2)" },
      { name: "In progress", value: inProgress, fill: "var(--color-chart-3)" },
      { name: "Queued", value: queued, fill: "var(--color-chart-1)" },
    ].filter((s) => s.value > 0);
<<<<<<< HEAD
  }, [overviewDocs]);

  const statusTotal = overviewDocs.length;
=======
  }, [docs]);

  const statusTotal = docs.length;
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba

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
          <span className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-mono-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Records current · synced every 5s
          </span>
          <Button variant="outline" onClick={() => setView("intake")}>
            <FileStack className="mr-2 size-4" /> Import records
          </Button>
          <Button onClick={() => setView("ocr")}>
            <ScanSearch className="mr-2 size-4" /> Process records
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
              <p className="text-mono-xs text-muted-foreground">records added per day, last 7 days</p>
            </div>
            <TrendingUp className="size-4 text-navy" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intakeTrend}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="records"
                  name="records added"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-chart-1)" }}
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
          {typeDistribution.length === 0 ? (
            <ChartEmpty message="No records imported yet." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeDistribution}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="type" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="records" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">Intake processed vs reports</h3>
              <p className="text-mono-xs text-muted-foreground">processed records against generated reports</p>
            </div>
            <GitMerge className="size-4 text-navy" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name="count" radius={[4, 4, 0, 0]}>
                  {comparison.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg text-foreground">Processing status</h3>
              <p className="text-mono-xs text-muted-foreground">complete, in progress, and queued records</p>
            </div>
            <Clock3 className="size-4 text-navy" />
          </div>
          {statusTotal === 0 ? (
            <ChartEmpty message="No records in this session yet." />
          ) : (
            <div className="flex h-64 items-center justify-center gap-6">
              <div className="relative h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={2}
                      stroke="var(--color-card)"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-serif text-2xl leading-none text-foreground">{statusTotal}</p>
                  <p className="text-mono-xs text-muted-foreground">records</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                {statusData.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: s.fill }} />
                    <span className="text-foreground">{s.name}</span>
                    <span className="text-mono-xs text-muted-foreground">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-4 text-navy" />
          <h3 className="font-serif text-lg text-foreground">Review progress</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
<<<<<<< HEAD
            { step: "Step 1", label: "Document intake", done: overviewDocs.length > 0, icon: FileStack },
            { step: "Step 2", label: "Processing & translation", done: ocrComplete, icon: ScanSearch },
            { step: "Step 3", label: "Clinical summary & timeline", done: Boolean(overviewSynthesis), icon: GitMerge },
=======
            { step: "Step 1", label: "Document intake", done: docs.length > 0, icon: FileStack },
            { step: "Step 2", label: "Processing & translation", done: ocrComplete, icon: ScanSearch },
            { step: "Step 3", label: "Clinical summary & timeline", done: Boolean(synthesis), icon: GitMerge },
>>>>>>> e0d9a72d36ad9936ddad13c6982739b5c1bd30ba
            { step: "Step 4", label: "Evaluation report", done: reportReady, icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.step} className="rounded-md border border-border bg-surface px-3 py-3 text-sm">
              <p className="text-mono-xs uppercase tracking-widest text-muted-foreground">{s.step}</p>
              <p className="mt-1 text-foreground">{s.label}</p>
              <p
                className={cn(
                  "mt-1 text-mono-xs",
                  s.done ? "text-success" : "text-warning",
                )}
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

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
