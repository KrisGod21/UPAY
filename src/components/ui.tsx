import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Button */

const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:opacity-90",
        accent: "bg-primary text-primary-fg hover:bg-primary-hover",
        secondary: "bg-surface-2 text-foreground hover:bg-border",
        outline: "border border-border bg-surface text-foreground hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
        mint: "bg-mint text-mint-ink hover:brightness-95",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3.5",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/** Small round icon button, as on the plan cards. */
export function IconButton({
  className,
  tone = "surface",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "surface" | "dark" | "mint" }) {
  const tones = {
    surface: "bg-surface-2 text-muted hover:text-foreground",
    dark: "bg-foreground text-background",
    mint: "bg-mint text-mint-ink",
  };
  return (
    <button
      className={cn(
        "press grid size-9 shrink-0 place-items-center rounded-full transition-colors [&_svg]:size-4",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card bg-surface shadow-[var(--shadow-card)]", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-bold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

/** A pastel card — the signature surface for anything with a state. */
const toneStyles = {
  mint: "bg-mint text-mint-ink",
  lilac: "bg-lilac text-lilac-ink",
  pink: "bg-pink text-pink-ink",
  sky: "bg-sky text-sky-ink",
  butter: "bg-butter text-butter-ink",
  peach: "bg-peach text-peach-ink",
  plain: "bg-surface text-foreground",
} as const;

export type PastelTone = keyof typeof toneStyles;

export function PastelCard({
  tone = "plain",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: PastelTone }) {
  return (
    <div
      className={cn(
        "lift rounded-card p-5 shadow-[var(--shadow-card)]",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- Badge */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-muted",
        primary: "bg-primary-soft text-primary",
        accent: "bg-accent-soft text-accent",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        mint: "bg-mint text-mint-ink",
        lilac: "bg-lilac text-lilac-ink",
        sky: "bg-sky text-sky-ink",
        butter: "bg-butter text-butter-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ------------------------------------------------------------ Form controls */

const fieldStyles =
  "w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldStyles, "min-h-24 resize-y rounded-base py-2.5", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldStyles, "h-11 pr-9", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block px-1 text-sm font-semibold text-foreground", className)} {...props} />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 px-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- Table */

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-border px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-border px-4 py-3 align-middle last:border-0", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------- Empty state */

export function EmptyState({
  title,
  description,
  action,
  emoji = "🌱",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  emoji?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border px-6 py-12 text-center">
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Stat tile */

export function Stat({
  label,
  value,
  sub,
  tone = "plain",
  emoji,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: PastelTone;
  emoji?: string;
}) {
  return (
    <div
      className={cn(
        "lift relative overflow-hidden rounded-card p-5 shadow-[var(--shadow-card)]",
        toneStyles[tone],
      )}
    >
      {emoji ? (
        <span className="absolute right-4 top-3 text-xl" aria-hidden>
          {emoji}
        </span>
      ) : null}
      <p className="tnum text-3xl font-extrabold leading-none">{value}</p>
      <p className="mt-2 text-sm font-semibold opacity-90">{label}</p>
      {sub ? <p className="mt-0.5 text-xs opacity-70">{sub}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Page head */

export function PageHeader({
  title,
  description,
  action,
  emoji,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  emoji?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
          {emoji ? (
            <span className="animate-float text-2xl sm:text-3xl" aria-hidden>
              {emoji}
            </span>
          ) : null}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------- Progress meter */

export function Meter({
  value,
  tone = "mint",
  label,
}: {
  value: number;
  tone?: "mint" | "butter" | "peach" | "sky";
  label?: string;
}) {
  const fills = {
    mint: "bg-[var(--mint-ink)]",
    butter: "bg-[var(--butter-ink)]",
    peach: "bg-[var(--peach-ink)]",
    sky: "bg-[var(--sky-ink)]",
  };
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fills[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
