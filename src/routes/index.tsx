import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/clinical/AppShell";
import { AuthScreen } from "@/components/clinical/AuthScreen";
import { DashboardView } from "@/components/clinical/DashboardView";
import { IntakeView } from "@/components/clinical/IntakeView";
import { OcrView } from "@/components/clinical/OcrView";
import { ReportView } from "@/components/clinical/ReportView";
import { SynthesisView } from "@/components/clinical/SynthesisView";
import { useClinicalStore } from "@/lib/clinical/store";

const TITLE = "Clinical Records Workspace | Medical Reports";
const DESCRIPTION =
  "Review multilingual medical records, patient timelines, clinical findings, care gaps, and formal medical reports.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <AppContent />
      <Toaster />
    </>
  );
}

function AppContent() {
  const { user, view, hydrated } = useClinicalStore();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <p className="text-sm text-muted-foreground">Preparing your clinical workspace…</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <AppShell>
      {view === "dashboard" && <DashboardView />}
      {view === "intake" && <IntakeView />}
      {view === "ocr" && <OcrView />}
      {view === "synthesis" && <SynthesisView />}
      {view === "report" && <ReportView />}
    </AppShell>
  );
}
