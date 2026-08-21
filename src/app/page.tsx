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
} from "lucide-react";
import { Button, Card } from "@/components/ui";

const features = [
  {
    icon: ScanFace,
    title: "Attendance from one class photo",
    body: "Faces are matched in the browser against the centre roster. The photograph never leaves the device and is never stored — only a 128-number embedding is kept.",
  },
  {
    icon: MapPin,
    title: "Geo-verified volunteer check-in",
    body: "Check-ins are validated against the centre's coordinates, so service hours reflect where a volunteer actually was.",
  },
  {
    icon: Sparkles,
    title: "AI assessments, human verified",
    body: "Papers are generated for a child's learning level, answer sheets are read by vision OCR, and nothing reaches a record until a volunteer confirms it.",
  },
  {
    icon: BookOpen,
    title: "Curriculum that reaches every centre",
    body: "Build units once, schedule them across centres, and see which lessons were actually delivered.",
  },
  {
    icon: BarChart3,
    title: "Analytics that name the problem",
    body: "Not just totals. Which centre is slipping, which children are falling behind, which centres are short of volunteers.",
  },
  {
    icon: Award,
    title: "Certificates issued automatically",
    body: "Service hours accumulate and eligible volunteers receive a serial-numbered certificate without anyone chasing a spreadsheet.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[--radius-base] bg-primary text-sm font-bold text-primary-fg">
              U
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">UPAY</p>
              <p className="text-xs text-muted">Footpathshala</p>
            </div>
          </div>
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="max-w-3xl animate-in">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" />
            Turning footpaths into schools
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            1,600 hours a month went into paperwork.
            <br />
            <span className="text-primary">They should have gone into teaching.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Footpathshala runs across zones, centres, volunteers and hundreds of children — on
            spreadsheets that do not talk to each other. This platform replaces that with one system
            that records what happens, and then answers questions about it in plain language.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button size="lg">
                Open the platform <ArrowRight />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                View the demo accounts
              </Button>
            </Link>
          </div>
        </div>

        <dl className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            ["1,600+", "staff hours a month previously spent organising data"],
            ["1 photo", "replaces a manual roll-call for an entire class"],
            ["0 images stored", "faces are kept as embeddings, never photographs"],
          ].map(([stat, label]) => (
            <Card key={stat} className="p-5">
              <dt className="tnum text-3xl font-semibold text-primary">{stat}</dt>
              <dd className="mt-1 text-sm text-muted">{label}</dd>
            </Card>
          ))}
        </dl>
      </section>

      <section className="border-t border-border bg-surface-2/50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">What it does</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Every module below writes to one database, which is what makes the analytics — and
            UpayGPT — possible at all.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-5">
                <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-[--radius-base] bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <Card className="overflow-hidden">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_1fr] lg:p-12">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                <Sparkles className="size-3.5" />
                UpayGPT
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ask the database a question the way you would ask a colleague.
              </h2>
              <p className="mt-4 text-muted">
                Nobody at a field NGO should need SQL to find out which centre is struggling. Type
                the question; UpayGPT writes the query, runs it against the real data, and shows you
                both the answer and the query it ran.
              </p>
              <p className="mt-4 text-sm text-muted">
                That last part matters. The generated SQL is always visible and always logged — an
                answer you cannot audit is not an answer.
              </p>
            </div>
            <div className="rounded-[--radius-base] border border-border bg-surface-2 p-5 font-mono text-sm">
              <p className="text-muted">&gt; Which centres had the lowest attendance last month?</p>
              <p className="mt-3 text-foreground">
                Three centres fell below 55%. Sitabuldi Signal dropped from 78% to 51% over six
                weeks — the steepest decline in the programme.
              </p>
              <p className="mt-3 text-xs text-accent">▾ see the SQL I ran</p>
            </div>
          </div>
        </Card>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted">
          <p>UPAY — Underprivileged Advancement by Youth. Footpathshala operations platform.</p>
          <Link href="/login" className="hover:text-foreground">
            Sign in →
          </Link>
        </div>
      </footer>
    </main>
  );
}
