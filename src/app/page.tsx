import Link from "next/link";
import {
  ScanFace,
  MapPin,
  Sparkles,
  BookOpen,
  BarChart3,
  Award,
  ArrowRight,
  ShieldCheck,
  Clock,
  Check,
  Upload,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui";

const features = [
  {
    icon: ScanFace,
    title: "Attendance from one photo",
    body: "Faces are matched in the browser against the centre roster. The photograph never leaves the device and is never stored — only a 128-number embedding is kept.",
    tone: "bg-mint text-mint-ink",
    emoji: "📸",
  },
  {
    icon: Sparkles,
    title: "Ask in plain language",
    body: "UpayGPT writes the SQL, runs it on live data, and shows you the query it used. An answer nobody can audit is not an answer.",
    tone: "bg-lilac text-lilac-ink",
    emoji: "✨",
  },
  {
    icon: MapPin,
    title: "Geo-verified check-in",
    body: "Distance from the centre is recomputed on the server, so service hours reflect where a volunteer actually stood.",
    tone: "bg-sky text-sky-ink",
    emoji: "📍",
  },
  {
    icon: BookOpen,
    title: "Curriculum that travels",
    body: "Build a lesson once, schedule it across centres, and see which lessons were genuinely delivered.",
    tone: "bg-butter text-butter-ink",
    emoji: "📚",
  },
  {
    icon: BarChart3,
    title: "Analytics that name names",
    body: "Not totals. Which centre is slipping, which children are falling behind, which centres are short of volunteers.",
    tone: "bg-peach text-peach-ink",
    emoji: "📊",
  },
  {
    icon: Award,
    title: "Certificates, issued automatically",
    body: "Hours accumulate and eligible volunteers receive a serial-numbered certificate without anyone chasing a spreadsheet.",
    tone: "bg-pink text-pink-ink",
    emoji: "🏅",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-page px-3 pb-10 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-[1400px]">
        {/* ------------------------------------------------------- top bar */}
        <header className="sticky top-3 z-40 flex items-center gap-3 rounded-panel bg-nav px-4 py-3 text-nav-fg shadow-[var(--shadow-lift)] sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-fg">
              U
            </span>
            <span className="leading-none">
              <span className="block text-sm font-extrabold tracking-tight">UPAY</span>
              <span className="block text-[11px] text-nav-muted">Footpathshala</span>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {[
              ["What it does", "#features"],
              ["UpayGPT", "#upaygpt"],
              ["Privacy", "#privacy"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="press rounded-full px-3.5 py-2 text-sm font-medium text-nav-muted transition-colors hover:bg-white/10 hover:text-nav-fg"
              >
                {label}
              </a>
            ))}
          </nav>

          <Link href="/login" className="ml-auto md:ml-0">
            <Button variant="accent" size="sm">
              Sign in <ArrowRight />
            </Button>
          </Link>
        </header>

        {/* ---------------------------------------------------------- hero */}
        <section className="mt-4 overflow-hidden rounded-panel bg-background p-6 shadow-[var(--shadow-card)] sm:p-10 lg:p-14">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="animate-in min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-bold text-mint-ink">
                <ShieldCheck className="size-3.5" />
                Turning footpaths into schools
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
                1,600 hours a month
                <br />
                went into paperwork
                <span className="ml-2 inline-block animate-float" aria-hidden>
                  🗂️
                </span>
                <br />
                <span className="text-primary">They should have gone into teaching.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
                Footpathshala runs across zones, centres, volunteers and hundreds of children — on
                spreadsheets that do not talk to each other. This replaces them with one system that
                records what happens, then answers questions about it in plain language.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button size="lg">
                    Open the platform <ArrowRight />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline">
                    See what it does
                  </Button>
                </a>
              </div>

              <dl className="stagger mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  ["1,600+", "hours a month, previously on data entry", "bg-sky text-sky-ink"],
                  ["1 photo", "marks a whole class register", "bg-mint text-mint-ink"],
                  ["0 images", "of children are ever stored", "bg-butter text-butter-ink"],
                ].map(([stat, label, tone]) => (
                  <div key={stat} className={`lift rounded-card p-4 ${tone}`}>
                    <dt className="tnum text-2xl font-extrabold">{stat}</dt>
                    <dd className="mt-1 text-xs font-medium opacity-80">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Product shot, built from the real components. */}
            <HeroPreview />
          </div>
        </section>

        {/* ------------------------------------------------------ features */}
        <section id="features" className="mt-4 rounded-panel bg-background p-6 shadow-[var(--shadow-card)] sm:p-10">
          <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            What it does <span className="animate-float" aria-hidden>🧩</span>
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Every module writes to one database. That is the whole point — it is what makes the
            analytics, and UpayGPT, possible at all.
          </p>

          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body, tone, emoji }) => (
              <article key={title} className={`lift rounded-card p-5 ${tone}`}>
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-white/60 dark:bg-white/10">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xl" aria-hidden>
                    {emoji}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold leading-snug">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="lift rounded-card bg-surface p-5 shadow-[var(--shadow-card)]">
              <span className="grid size-11 place-items-center rounded-full bg-surface-2">
                <Upload className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">Bring the old records with you</h3>
              <p className="mt-2 text-sm text-muted">
                Years of spreadsheets import through a column-mapping step, so the new system starts
                with the history rather than pretending it does not exist.
              </p>
            </div>
            <div className="lift rounded-card bg-surface p-5 shadow-[var(--shadow-card)]">
              <span className="grid size-11 place-items-center rounded-full bg-surface-2">
                <Languages className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold">Hindi where it matters</h3>
              <p className="mt-2 text-sm text-muted">
                Navigation and the controls a volunteer touches in the field are translated — not a
                machine-translated shell that claims more than it delivers.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- upaygpt */}
        <section id="upaygpt" className="mt-4 rounded-panel bg-background p-6 shadow-[var(--shadow-card)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-lilac px-3.5 py-1.5 text-xs font-bold text-lilac-ink">
                <Sparkles className="size-3.5" /> UpayGPT
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-4xl">
                Ask the database a question the way you would ask a colleague.
              </h2>
              <p className="mt-4 text-muted">
                Nobody at a field NGO should need SQL to find out which centre is struggling. Type
                the question; UpayGPT writes the query, runs it against live data, and shows you both
                the answer and the query.
              </p>
              <p className="mt-4 text-sm text-muted">
                That last part is the design. The generated SQL is always visible and always logged,
                and it runs under your own permissions — asking a question differently does not widen
                what you are allowed to see.
              </p>
            </div>

            <div className="animate-in min-w-0 space-y-3 rounded-panel bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="ml-auto w-fit max-w-[85%] rounded-card rounded-br-md bg-primary-soft px-4 py-2.5 text-sm font-medium text-primary">
                Which centres had the lowest attendance last month?
              </div>
              <div className="min-w-0 max-w-[92%] rounded-card rounded-bl-md bg-surface-2 px-4 py-3 text-sm">
                <p>
                  Three centres fell below 55%. Sitabuldi Signal dropped from 78% to 51% over six
                  weeks — the steepest decline in the programme.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-surface px-2.5 py-1 font-semibold">12 rows</span>
                  <span className="rounded-full bg-surface px-2.5 py-1 font-semibold">1.8s</span>
                  <span className="text-accent">▾ see the SQL I ran</span>
                </div>
                <pre className="mt-3 max-w-full overflow-x-auto rounded-base bg-nav p-3 text-[11px] leading-relaxed text-nav-fg">
                  <code>{`select center_name,
       round(avg(attendance_rate), 1) as rate
from v_attendance_daily
where session_date >= date_trunc('month',
        current_date - interval '1 month')
group by center_name
order by rate asc
limit 12`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- privacy */}
        <section id="privacy" className="mt-4 rounded-panel bg-nav p-6 text-nav-fg shadow-[var(--shadow-lift)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold">
                <ShieldCheck className="size-3.5" /> These are children
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Face recognition, without a database of children&rsquo;s faces.
              </h2>
              <p className="mt-4 text-nav-muted">
                Recognition runs entirely in the volunteer&rsquo;s browser. The class photograph is
                decoded, measured, and discarded on the device — it is never uploaded, and there is
                no column in the schema to store it in.
              </p>
              <p className="mt-3 text-nav-muted">
                What is saved is a list of 128 numbers per child, which cannot be turned back into a
                photograph. Every match is shown to the volunteer with a confidence reading, and they
                can override any row before the register is saved.
              </p>
            </div>

            <ul className="stagger space-y-3">
              {[
                ["Photo captured on the volunteer's phone", "stays on the device"],
                ["Faces detected and measured in the browser", "no upload, no server cost"],
                ["Matched against that centre's roster only", "128 numbers, never an image"],
                ["Volunteer reviews and corrects", "the model never has the last word"],
              ].map(([step, note], i) => (
                <li key={step} className="flex items-start gap-3 rounded-card bg-white/5 p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-fg">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{step}</p>
                    <p className="text-sm text-nav-muted">{note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="mt-4 rounded-panel bg-background p-8 text-center shadow-[var(--shadow-card)] sm:p-14">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Give the hours back to the children
            <span className="ml-2 inline-block animate-float" aria-hidden>
              🎈
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Sign in with a demo account to walk through every module with realistic data behind it.
          </p>
          <Link href="/login" className="mt-8 inline-block">
            <Button size="lg">
              Open the platform <ArrowRight />
            </Button>
          </Link>
        </section>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-panel bg-background px-6 py-6 text-sm text-muted shadow-[var(--shadow-card)]">
          <p>UPAY — Underprivileged Advancement by Youth · Footpathshala operations platform</p>
          <Link href="/login" className="font-semibold hover:text-foreground">
            Sign in →
          </Link>
        </footer>
      </div>
    </main>
  );
}

/** A stylised preview of the real dashboard, assembled from the same tokens. */
function HeroPreview() {
  return (
    <div className="animate-in relative">
      <div className="rounded-panel bg-nav p-2.5 shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="ml-2 text-[11px] font-semibold text-nav-muted">
            Footpathshala · Dashboard
          </span>
        </div>

        <div className="rounded-panel bg-background p-4">
          <p className="text-sm font-extrabold">Hello, Meera 👋</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["412", "children", "bg-sky text-sky-ink"],
              ["71%", "attendance", "bg-mint text-mint-ink"],
              ["64", "volunteers", "bg-lilac text-lilac-ink"],
            ].map(([n, l, tone]) => (
              <div key={l} className={`rounded-base p-2.5 ${tone}`}>
                <p className="tnum text-lg font-extrabold leading-none">{n}</p>
                <p className="mt-1 text-[10px] font-semibold opacity-80">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-base bg-surface p-3 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-bold text-muted">ATTENDANCE TREND</p>
            <svg viewBox="0 0 240 64" className="mt-2 h-16 w-full" role="img" aria-label="Rising then dipping attendance trend">
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-3)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--series-3)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M0,44 C24,38 36,22 60,26 C84,30 96,14 120,18 C144,22 156,34 180,30 C204,26 216,40 240,36 L240,64 L0,64 Z"
                fill="url(#heroFill)"
              />
              <path
                d="M0,44 C24,38 36,22 60,26 C84,30 96,14 120,18 C144,22 156,34 180,30 C204,26 216,40 240,36"
                fill="none"
                stroke="var(--series-3)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 rounded-base bg-mint p-2.5 text-mint-ink">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/60 dark:bg-white/10">
                <Check className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">Numeracy — Building blocks</p>
                <p className="text-[10px] opacity-80">Delivered 👏 · 45 min</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-base bg-lilac p-2.5 text-lilac-ink">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/60 dark:bg-white/10">
                <Clock className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">Life Skills — Practice</p>
                <p className="text-[10px] opacity-80">Coming up ⏳ · Thu</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent cards */}
      <div className="animate-float absolute -left-3 top-1/3 hidden rounded-card bg-butter p-3 text-butter-ink shadow-[var(--shadow-lift)] sm:block">
        <p className="text-[10px] font-bold uppercase tracking-wide">Recognised</p>
        <p className="tnum text-xl font-extrabold">18 / 21</p>
        <p className="text-[10px] opacity-80">faces matched 🎯</p>
      </div>

      <div
        className="animate-float absolute -right-2 bottom-6 hidden rounded-card bg-pink p-3 text-pink-ink shadow-[var(--shadow-lift)] sm:block"
        style={{ animationDelay: "1.2s" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide">Certificate</p>
        <p className="text-sm font-extrabold">100 hours 🏅</p>
      </div>
    </div>
  );
}
