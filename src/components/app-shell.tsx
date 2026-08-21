"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Icons from "lucide-react";
import { Menu, X, LogOut } from "lucide-react";
import { cn, initials, ROLE_LABELS } from "@/lib/utils";
import { navForRole } from "@/lib/nav";
import type { Profile } from "@/lib/types";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";

const GROUP_ORDER = ["Operations", "Programme", "Insight", "Administration"] as const;

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Cmp ? <Cmp className={className} /> : null;
}

export function AppShell({
  profile,
  signOutAction,
  children,
}: {
  profile: Profile;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  const items = navForRole(profile.role);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (!groupItems.length) return null;
        return (
          <div key={group}>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t(`group.${group}`)}
            </p>
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[--radius-base] px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary-soft font-medium text-primary"
                          : "text-muted hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <Icon name={item.icon} className="size-4 shrink-0" />
                      {t(`nav.${item.label}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-border px-4 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-[--radius-base] bg-primary text-sm font-bold text-primary-fg">
            U
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">UPAY</p>
            <p className="text-xs text-muted">Footpathshala</p>
          </div>
        </Link>
        {nav}
        <UserBlock profile={profile} signOutAction={signOutAction} />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <p className="text-sm font-semibold">UPAY Footpathshala</p>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <UserBlock profile={profile} signOutAction={signOutAction} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold">UPAY Footpathshala</p>
          <div className="ml-auto">
            <LanguageToggle />
          </div>
        </header>

        <div className="hidden items-center justify-end gap-3 border-b border-border px-6 py-2.5 lg:flex">
          <LanguageToggle />
        </div>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function UserBlock({
  profile,
  signOutAction,
}: {
  profile: Profile;
  signOutAction: () => Promise<void>;
}) {
  const t = useT();
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5 px-1 py-1.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {initials(profile.full_name)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-1 flex w-full items-center gap-2.5 rounded-[--radius-base] px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <LogOut className="size-4" />
          {t("action.signOut")}
        </button>
      </form>
    </div>
  );
}
