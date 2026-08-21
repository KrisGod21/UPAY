"use client";

import { Languages } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-0.5">
      <Languages className="ml-1.5 size-3.5 text-muted" />
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            lang === l ? "bg-primary text-primary-fg" : "text-muted hover:text-foreground",
          )}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
