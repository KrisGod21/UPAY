import Link from "next/link";
import { ArrowLeft, ScanFace, Sparkles, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — UPAY Footpathshala" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="min-h-screen bg-page px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1300px] gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------------- brand */}
        <section className="relative hidden flex-col justify-between overflow-hidden rounded-panel bg-nav p-10 text-nav-fg shadow-[var(--shadow-lift)] lg:flex">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-fg">
              U
            </span>
            <span className="leading-none">
              <span className="block text-sm font-extrabold tracking-tight">UPAY</span>
              <span className="block text-[11px] text-nav-muted">Footpathshala</span>
            </span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
              One record of what actually happened at every centre.
              <span className="ml-2 inline-block animate-float" aria-hidden>
                ✨
              </span>
            </h2>
            <p className="mt-4 text-nav-muted">
              Attendance, service hours, lessons delivered and assessment results — captured once,
              usable everywhere, including by people who have never written a database query.
            </p>

            <div className="stagger mt-8 space-y-3">
              {[
                { icon: ScanFace, text: "A class photo marks the whole register", tone: "bg-mint text-mint-ink" },
                { icon: Sparkles, text: "Ask questions in plain language", tone: "bg-lilac text-lilac-ink" },
                { icon: ShieldCheck, text: "No photograph of a child is ever stored", tone: "bg-sky text-sky-ink" },
              ].map(({ icon: Icon, text, tone }) => (
                <div key={text} className={`flex items-center gap-3 rounded-card p-3.5 ${tone}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/60 dark:bg-white/10">
                    <Icon className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-nav-muted">
            Underprivileged Advancement by Youth · Footpathshala operations platform
          </p>
        </section>

        {/* -------------------------------------------------------- form */}
        <section className="flex items-center justify-center rounded-panel bg-background p-6 shadow-[var(--shadow-card)] sm:p-10">
          <div className="animate-in w-full max-w-sm">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="size-4" /> Back
            </Link>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Welcome back <span aria-hidden>👋</span>
            </h1>
            <p className="mb-7 mt-1.5 text-sm text-muted">
              Pick a demo account below, or use your own credentials.
            </p>

            <LoginForm
              next={next ?? "/dashboard"}
              demoPassword={process.env.DEMO_PASSWORD ?? "upay@2026"}
            />

            <p className="mt-6 rounded-card bg-surface-2 p-4 text-xs leading-relaxed text-muted">
              Every demo account uses the same password, pre-filled above. Roles are enforced by
              row-level security in the database, not only in the interface — signing in as the
              coordinator genuinely restricts what the queries return.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
