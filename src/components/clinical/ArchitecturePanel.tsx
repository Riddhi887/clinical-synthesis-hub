import { Layers } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STACK = [
  {
    title: "OCR & Rasterisation",
    items: ["Tesseract.js (browser WASM)", "PyTesseract", "EasyOCR + CRAFT detector"],
  },
  {
    title: "Auto-classification & Medical Entity Extraction",
    items: [
      "Hugging Face Inference Providers",
      "Clinical-AI-Apollo/Medical-NER",
      "samant/medical-ner",
      "LayoutLM-v3 page segmentation",
    ],
  },
  {
    title: "Neural Language Translation",
    items: ["Hugging Face MarianMT", "HuggingFaceH4 translation pipeline", "facebook/bart fallback"],
  },
  {
    title: "Sentence Formatting & Report Synthesis",
    items: [
      "Hugging Face Inference Providers API",
      "meta-llama/Llama-3.3-70B-Instruct",
      "mistralai/Mixtral-8x7B-Instruct",
    ],
  },
  {
    title: "Database & Persistence",
    items: [
      "Browser LocalStorage / IndexedDB session provider",
      "Simulated PostgreSQL / Supabase schema",
      "UUID primary key constraints on asset slots",
    ],
  },
  {
    title: "Resilience",
    items: [
      "Deterministic client-side fallback corpus",
      "No token key required — API timeouts never surface exceptions",
    ],
  },
];

export function ArchitecturePanel() {
  return (
    <Collapsible className="rounded-md border border-sidebar-border bg-sidebar-accent/40">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
        <Layers className="size-3.5 shrink-0" />
        Architecture &amp; Technology Stack
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-72 overflow-y-auto border-t border-sidebar-border px-3 py-3">
        <div className="space-y-3">
          {STACK.map((group) => (
            <div key={group.title}>
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sidebar-foreground/70">
                {group.title}
              </p>
              <ul className="mt-1 space-y-0.5">
                {group.items.map((item) => (
                  <li key={item} className="text-mono-xs text-sidebar-foreground/55">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
