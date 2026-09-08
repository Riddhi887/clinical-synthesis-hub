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
const MAIN: { key: ViewKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "dashboard", label: "Overview", icon: BarChart3 },
  { key: "workspace", label: "Patient Cases", icon: Briefcase },
];

const PIPELINE: { key: ViewKey; label: string; step: string; icon: typeof FileStack }[] = [
  { key: "intake", label: "Import Records", step: "Step 1", icon: FileStack },
  { key: "ocr", label: "Process & Translate", step: "Step 2", icon: ScanSearch },
  { key: "synthesis", label: "Clinical Summary", step: "Step 3", icon: GitMerge },
  { key: "report", label: "Executive Report", step: "Step 4", icon: FileText },
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
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto bg-sidebar px-4 py-5 lg:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Activity className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-sidebar-foreground">Clinical Records</p>
              <p className="text-xs text-sidebar-foreground/60">care review workspace</p>
            </div>
          </div>

          <nav className="space-y-6">
            <div className="space-y-1">
              <p className="px-2 text-[0.66rem] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Workspace
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
                Clinical workflow
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

        <div className="border-t border-sidebar-border pt-4">
          <p className="flex items-center gap-2 text-xs text-sidebar-foreground/65">
            <span className="size-2 rounded-full bg-success" /> Ready for clinical review
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">
              Clinical History &amp; Medical Records
            </h1>
            <p className="text-mono-xs text-muted-foreground">
              Patient record review and medical reporting
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="text-mono-xs text-muted-foreground">
                Records current · updated {lastSync}
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
                    Clinical Reviewer
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block text-sm">{user}</span>
                  <span className="block text-mono-xs font-normal text-muted-foreground">
                    Clinical Reviewer
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-mono-xs">
                  Secure review session
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

        <main className="min-w-0 flex-1 overflow-y-auto px-5 py-6 lg:px-8 lg:py-8">{children}</main>
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
