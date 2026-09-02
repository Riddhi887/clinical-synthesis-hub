import { useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClinicalStore } from "@/lib/clinical/store";

export function AuthScreen() {
  const { login } = useClinicalStore();
  const [email, setEmail] = useState("dr.smith@clinical.ai");
  const [password, setPassword] = useState("demo-access-token");
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      login(email.trim());
      toast.success("Session authenticated", {
        description: `Signed in as ${email.trim()} · Clinical Data Analyst`,
      });
    }, 1200);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Activity className="size-5" />
          </span>
          <span className="font-serif text-lg tracking-tight">Clinical Health Synthesis System</span>
        </div>
        <div className="max-w-md space-y-5">
          <h1 className="font-serif text-4xl leading-tight">
            Multilingual medical records, synthesised into evaluation-grade clinical narrative.
          </h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/70">
            Bulk intake, OCR rasterisation, neural translation, entity resolution and executive
            report generation — one deterministic pipeline across four supervised steps.
          </p>
          <ul className="space-y-2 text-mono-xs text-sidebar-foreground/60">
            <li>tesseract.js · easyocr · layoutlm-v3</li>
            <li>Clinical-AI-Apollo/Medical-NER · samant/medical-ner</li>
            <li>MarianMT translation pipeline · Llama-3.3-70B-Instruct synthesis</li>
          </ul>
        </div>
        <p className="text-mono-xs text-sidebar-foreground/45">
          Restricted environment · de-identified demonstration corpus
        </p>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-16">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-mono-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> mock authentication
            </span>
            <h2 className="font-serif text-2xl text-foreground">Analyst sign-in</h2>
            <p className="text-sm text-muted-foreground">
              Demo credentials are pre-filled. No external identity provider is contacted.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Clinical email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Access token</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Authenticating session…
              </>
            ) : (
              "Enter workspace"
            )}
          </Button>

          <p className="text-mono-xs text-muted-foreground">
            Session state persists in browser storage (simulated PostgreSQL schema with UUID primary
            keys). Uploaded files, telemetry and reports survive navigation.
          </p>
        </form>
      </div>
    </div>
  );
}
