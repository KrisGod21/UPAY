import Link from "next/link";
import { Clock, Check, CircleDashed, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PastelTone } from "@/components/ui";

export interface PlanItem {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  when: string;
  status: "delivered" | "scheduled" | "skipped";
  durationMin?: number | null;
  href?: string;
}

const STATUS: Record<
  PlanItem["status"],
  { label: string; emoji: string; tone: PastelTone; icon: typeof Check }
> = {
  delivered: { label: "Delivered", emoji: "👏", tone: "mint", icon: Check },
  scheduled: { label: "Coming up", emoji: "⏳", tone: "lilac", icon: CircleDashed },
  skipped: { label: "Missed", emoji: "🌧️", tone: "peach", icon: SkipForward },
};

/**
 * A vertical track of lesson cards joined by a dotted line — the plan reads as
 * a route the centre is walking rather than an undifferentiated list.
 */
export function PlanTrack({ items }: { items: PlanItem[] }) {
  if (!items.length) {
    return (
      <p className="rounded-card border-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        Nothing scheduled for this centre yet.
      </p>
    );
  }

  return (
    <ol className="stagger relative space-y-3">
      {items.map((item, i) => {
        const meta = STATUS[item.status];
        const Icon = meta.icon;
        const last = i === items.length - 1;

        const card = (
          <div
            className={cn(
              "lift rounded-card p-4 shadow-[var(--shadow-card)]",
              meta.tone === "mint" && "bg-mint text-mint-ink",
              meta.tone === "lilac" && "bg-lilac text-lilac-ink",
              meta.tone === "peach" && "bg-peach text-peach-ink",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {item.subject}
                </p>
                <h4 className="mt-0.5 text-base font-bold leading-snug">{item.title}</h4>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-sm opacity-80">{item.description}</p>
                ) : null}
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/50 dark:bg-white/10">
                <Icon className="size-4" />
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 font-semibold dark:bg-white/10">
                {meta.label} {meta.emoji}
              </span>
              <span className="inline-flex items-center gap-1.5 opacity-75">
                <Clock className="size-3.5" />
                {item.when}
                {item.durationMin ? ` · ${item.durationMin} min` : ""}
              </span>
            </div>
          </div>
        );

        return (
          <li key={item.id} className="relative pl-6">
            {/* Dotted connector down to the next card. */}
            <span
              aria-hidden
              className={cn(
                "absolute left-[7px] top-3 w-px border-l-2 border-dotted border-border",
                last ? "h-0" : "h-[calc(100%+0.75rem)]",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-3 size-3.5 rounded-full border-2 border-background",
                item.status === "delivered" && "bg-[var(--mint-ink)]",
                item.status === "scheduled" && "bg-[var(--lilac-ink)]",
                item.status === "skipped" && "bg-[var(--peach-ink)]",
              )}
            />
            {item.href ? <Link href={item.href}>{card}</Link> : card}
          </li>
        );
      })}
    </ol>
  );
}
