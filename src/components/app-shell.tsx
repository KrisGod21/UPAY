"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { ChevronDown, LogOut, Menu, MoreHorizontal, X } from "lucide-react";
import { cn, initials, ROLE_LABELS } from "@/lib/utils";
import { navForRole, type NavItem } from "@/lib/nav";
import type { Profile } from "@/lib/types";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";

const GROUP_ORDER = ["Operations", "Programme", "Insight", "Administration"] as const;

/** How many links fit inline in the top bar before the rest fold into "More". */
const INLINE_LIMIT = 5;

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Cmp ? <Cmp className={className} /> : null;
}

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
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
  const items = navForRole(profile.role);
  const inline = items.slice(0, INLINE_LIMIT);
  const overflow = items.slice(INLINE_LIMIT);

  const [drawer, setDrawer] = useState(false);
  const [more, setMore] = useState(false);
  const [account, setAccount] = useState(false);

  const moreRef = useOutsideClose(() => setMore(false));
  const accountRef = useOutsideClose(() => setAccount(false));

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-page px-3 pb-6 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-[1500px]">
        {/* ------------------------------------------------------- top bar */}
        <header className="sticky top-3 z-40 flex items-center gap-3 rounded-panel bg-nav px-4 py-3 text-nav-fg shadow-[var(--shadow-lift)] sm:px-5">
          <button
            className="press grid size-9 place-items-center rounded-full bg-white/10 lg:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4.5" />
          </button>

          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-fg">
              U
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block text-sm font-extrabold tracking-tight">UPAY</span>
              <span className="block text-[11px] text-nav-muted">Footpathshala</span>
            </span>
          </Link>

          {/* Inline navigation */}
          <nav className="mx-auto hidden items-center gap-1 lg:flex">
            {inline.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "press flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-white/15 text-nav-fg"
                    : "text-nav-muted hover:bg-white/8 hover:text-nav-fg",
                )}
              >
                <Icon name={item.icon} className="size-4" />
                {t(`nav.${item.label}`)}
              </Link>
            ))}

            {overflow.length ? (
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMore((v) => !v)}
                  aria-expanded={more}
                  className={cn(
                    "press flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    overflow.some((i) => isActive(i.href))
                      ? "bg-white/15 text-nav-fg"
                      : "text-nav-muted hover:bg-white/8 hover:text-nav-fg",
                  )}
                >
                  <MoreHorizontal className="size-4" />
                  More
                </button>
                {more ? (
                  <div className="animate-pop absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-card bg-surface p-2 shadow-[var(--shadow-lift)]">
                    <GroupedLinks
                      items={overflow}
                      isActive={isActive}
                      onNavigate={() => setMore(false)}
                      t={t}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>

            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccount((v) => !v)}
                aria-expanded={account}
                className="press flex items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-white/15"
              >
                <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">
                  {initials(profile.full_name)}
                </span>
                <span className="hidden text-left leading-tight md:block">
                  <span className="block max-w-[9rem] truncate text-xs font-semibold">
                    {profile.full_name}
                  </span>
                  <span className="block text-[11px] text-nav-muted">{ROLE_LABELS[profile.role]}</span>
                </span>
                <ChevronDown className="size-4 text-nav-muted" />
              </button>

              {account ? (
                <div className="animate-pop absolute right-0 top-full z-50 mt-2 w-60 rounded-card bg-surface p-2 shadow-[var(--shadow-lift)]">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-foreground">{profile.full_name}</p>
                    <p className="truncate text-xs text-muted">{profile.email}</p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <div className="px-3 py-2 sm:hidden">
                    <LanguageToggle />
                  </div>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-base px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <LogOut className="size-4" />
                      {t("action.signOut")}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------- drawer */}
        {drawer ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} aria-hidden />
            <aside className="animate-pop absolute left-2 top-2 flex max-h-[calc(100vh-1rem)] w-[17rem] origin-top-left flex-col overflow-hidden rounded-panel bg-surface shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between px-4 py-4">
                <span className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-fg">
                    U
                  </span>
                  <span className="text-sm font-extrabold">Footpathshala</span>
                </span>
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="press">
                  <X className="size-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-2 pb-4">
                <GroupedLinks
                  items={items}
                  isActive={isActive}
                  onNavigate={() => setDrawer(false)}
                  t={t}
                  grouped
                />
              </div>
            </aside>
          </div>
        ) : null}

        {/* ------------------------------------------------------- content */}
        <main className="mt-4 rounded-panel bg-background p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function GroupedLinks({
  items,
  isActive,
  onNavigate,
  t,
  grouped = false,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  t: (key: string) => string;
  grouped?: boolean;
}) {
  const render = (list: NavItem[]) =>
    list.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-base px-3 py-2 text-sm transition-colors",
          isActive(item.href)
            ? "bg-primary-soft font-semibold text-primary"
            : "text-muted hover:bg-surface-2 hover:text-foreground",
        )}
      >
        <Icon name={item.icon} className="size-4 shrink-0" />
        {t(`nav.${item.label}`)}
      </Link>
    ));

  if (!grouped) return <div className="space-y-0.5">{render(items)}</div>;

  return (
    <div className="space-y-4">
      {GROUP_ORDER.map((group) => {
        const list = items.filter((i) => i.group === group);
        if (!list.length) return null;
        return (
          <div key={group}>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">
              {t(`group.${group}`)}
            </p>
            <div className="space-y-0.5">{render(list)}</div>
          </div>
        );
      })}
    </div>
  );
}
