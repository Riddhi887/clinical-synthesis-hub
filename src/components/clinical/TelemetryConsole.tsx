import { useEffect, useRef } from "react";
import { ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";
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
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <ClipboardCheck className="size-4 text-navy" />
          Processing details
          <span className="text-muted-foreground">· {logs.length} updates</span>
          {running && (
             <span className="ml-1 inline-flex items-center gap-1 text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> streaming
            </span>
          )}
        </div>
         <Button variant="ghost" size="sm" onClick={onToggle} className="h-7">
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          <span className="ml-1 text-mono-xs">{open ? "collapse" : "expand"}</span>
        </Button>
      </header>
      {open && (
        <div className="max-h-64 overflow-y-auto px-4 py-3">
          {logs.length === 0 ? (
            <p className="text-mono-xs text-terminal-foreground/45">
               Processing updates will appear here when record review begins.
            </p>
          ) : (
             <pre className="text-mono-xs whitespace-pre-wrap break-words text-muted-foreground">
              {logs.join("\n")}
            </pre>
          )}
          <div ref={endRef} />
        </div>
      )}
    </section>
  );
}
