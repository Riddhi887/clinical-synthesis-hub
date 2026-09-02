import { useEffect, useRef } from "react";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinicalStore } from "@/lib/clinical/store";

export function TelemetryConsole({
  open,
  onToggle,
  running,
}: {
  open: boolean;
  onToggle: () => void;
  running: boolean;
}) {
  const { logs } = useClinicalStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [logs, open]);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-terminal">
      <header className="flex items-center justify-between border-b border-terminal-foreground/15 px-4 py-2">
        <div className="flex items-center gap-2 text-mono-xs text-terminal-foreground">
          <Terminal className="size-3.5" />
          live telemetry console
          <span className="text-terminal-foreground/50">· {logs.length} events</span>
          {running && (
            <span className="ml-1 inline-flex items-center gap-1 text-terminal-foreground/80">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> streaming
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-7 text-terminal-foreground hover:bg-terminal-foreground/10 hover:text-terminal-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          <span className="ml-1 text-mono-xs">{open ? "collapse" : "expand"}</span>
        </Button>
      </header>
      {open && (
        <div className="max-h-64 overflow-y-auto px-4 py-3">
          {logs.length === 0 ? (
            <p className="text-mono-xs text-terminal-foreground/45">
              awaiting pipeline execution — no operational events recorded for this session
            </p>
          ) : (
            <pre className="text-mono-xs whitespace-pre-wrap break-words text-terminal-foreground">
              {logs.join("\n")}
            </pre>
          )}
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}
