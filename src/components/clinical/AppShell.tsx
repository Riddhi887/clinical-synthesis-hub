import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Briefcase,
  FileStack,
  FileText,
  GitMerge,
  LogOut,
  ScanSearch,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useClinicalStore, type ViewKey } from "@/lib/clinical/store";
import { ArchitecturePanel } from "./ArchitecturePanel";

const MAIN: { key: ViewKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "workspace", label: "Workspace & Cases", icon: Briefcase },
];

const PIPELINE: { key: ViewKey; label: string; step: string; icon: typeof FileStack }[] = [
  { key: "intake", label: "Document Intake", step: "Step 1", icon: FileStack },
  { key: "ocr", label: "OCR & Neural Translation", step: "Step 2", icon: ScanSearch },
  { key: "synthesis", label: "Synthesis & Timeline", step: "Step 3", icon: GitMerge },
  { key: "report", label: "Medical Evaluation Report", step: "Step 4", icon: FileText },
];

export function AppShell({ children, lastSync }: { children: ReactNode; lastSync: string }) {
  const { view, setView, user, logout, docs, synthesis, reportReady } = useClinicalStore();

  const badgeFor = (key: ViewKey) => {
    if (key === "intake" && docs.length) return String(docs.length);
    if (key === "synthesis" && synthesis) return "✓";
    if (key === "report" && reportReady) return "✓";
    return null;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 shrink-0 flex-col justify-between bg-sidebar px-4 py-5 lg:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Activity className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-serif text-sm text-sidebar-foreground">Clinical Health</p>
              <p className="text-mono-xs text-sidebar-foreground/55">synthesis system</p>
            </div>
          </div>

          <nav className="space-y-6">
            <div className="space-y-1">
              <p className="px-2 text-[0.66rem] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Main views
              </p>
              {MAIN.map((item) => (
                <NavButton
                  key={item.key}
                  active={view === item.key}
                  onClick={() => setView(item.key)}
                  icon={<item.icon className="size-4" />}
                  label={item.label}
                />
              ))}
            </div>

            <div className="space-y-1">
              <p className="px-2 text-[0.66rem] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Pipeline workflow
              </p>
              {PIPELINE.map((item) => (
                <NavButton
                  key={item.key}
                  active={view === item.key}
                  onClick={() => setView(item.key)}
                  icon={<item.icon className="size-4" />}
                  label={item.label}
                  hint={item.step}
                  badge={badgeFor(item.key)}
                />
              ))}
            </div>
          </nav>
        </div>

        <div className="space-y-3">
          <ArchitecturePanel />
          <p className="text-mono-xs text-sidebar-foreground/35">
            build 4.2.1 · deterministic fallback active
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/90 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg text-foreground">
              Clinical Health Synthesis System
            </h1>
            <p className="text-mono-xs text-muted-foreground">
              multilingual medical record intake · synthesis · evaluation reporting
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="text-mono-xs text-muted-foreground">
                system operational · auto-sync active · {lastSync}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-accent">
                  <span className="flex size-8 items-center justify-center rounded-full bg-navy text-navy-foreground">
                    <UserRound className="size-4" />
                  </span>
                  <span className="hidden leading-tight sm:block">
                    <span className="block text-xs font-medium text-foreground">
                      {user ?? "analyst"}
                    </span>
                    <span className="block text-mono-xs text-muted-foreground">
                      Clinical Data Analyst
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block text-sm">{user}</span>
                  <span className="block text-mono-xs font-normal text-muted-foreground">
                    role: Clinical Data Analyst
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-mono-xs">
                  session persisted locally
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    toast.info("Signed out", {
                      description: "Session state cleared. Returned to authentication.",
                    });
                  }}
                >
                  <LogOut className="mr-2 size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:hidden">
          {[...MAIN, ...PIPELINE].map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={view === item.key ? "default" : "ghost"}
              onClick={() => setView(item.key)}
              className="shrink-0 text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>

        <main className="min-w-0 flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  hint,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  hint?: string;
  badge?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 leading-tight">
        {hint && (
          <span
            className={cn(
              "block text-[0.62rem] uppercase tracking-widest",
              active ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/45",
            )}
          >
            {hint}
          </span>
        )}
        <span className="block truncate">{label}</span>
      </span>
      {badge && (
        <span className="rounded-full bg-success/20 px-1.5 py-0.5 text-[0.62rem] text-success">
          {badge}
        </span>
      )}
    </button>
  );
}
