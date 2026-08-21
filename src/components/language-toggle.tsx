"use client";

import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ onDark = true }: { onDark?: boolean }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full p-0.5",
        onDark ? "bg-white/10" : "bg-surface-2",
      )}
      role="group"
      aria-label="Language"
    >
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "press rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
            lang === l
              ? "bg-primary text-primary-fg"
              : onDark
                ? "text-nav-muted hover:text-nav-fg"
                : "text-muted hover:text-foreground",
          )}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
