import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { LEVEL_LABELS, formatDate } from "@/lib/utils";

export const metadata = { title: "Assessments — UPAY Footpathshala" };

const LEVEL_TONE: Record<string, string> = {
  foundation: "bg-mint text-mint-ink",
  level_1: "bg-sky text-sky-ink",
  level_2: "bg-lilac text-lilac-ink",
  level_3: "bg-butter text-butter-ink",
  bridge: "bg-peach text-peach-ink",
};

export default async function AssessmentsPage() {
  const { supabase } = await requireProfile();

  const { data } = await supabase
    .from("assessments")
    .select("id, title, subject, level, total_marks, ai_generated, created_at, assessment_results(id, percentage)")
    .order("created_at", { ascending: false })
    .limit(60);

  const assessments = (data ?? []) as unknown as {
    id: string;
    title: string;
    subject: string;
    level: string;
    total_marks: number;
    ai_generated: boolean;
    created_at: string;
    assessment_results: { id: string; percentage: number }[];
  }[];

  const totalTaken = assessments.reduce((s, a) => s + a.assessment_results.length, 0);
  const aiCount = assessments.filter((a) => a.ai_generated).length;
  const allPercents = assessments.flatMap((a) => a.assessment_results.map((r) => Number(r.percentage)));
  const overallAvg = allPercents.length
    ? Math.round((allPercents.reduce((s, p) => s + p, 0) / allPercents.length) * 10) / 10
    : null;

  return (
    <>
      <PageHeader
        title="Assessments"
        emoji="📝"
        description="Papers pitched at a child's learning level, graded from a photograph, confirmed by a person."
        action={
          <Link href="/assessments/new">
            <Button>
              <Plus /> Generate a paper
            </Button>
          </Link>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Papers" value={assessments.length} tone="sky" emoji="📄" />
        <Stat label="Sheets marked" value={totalTaken} tone="mint" emoji="✅" />
        <Stat
          label="Average score"
          value={overallAvg != null ? `${overallAvg}%` : "—"}
          tone={overallAvg != null && overallAvg >= 60 ? "mint" : "butter"}
          emoji="📈"
        />
        <Stat label="AI generated" value={aiCount} sub={`of ${assessments.length} papers`} tone="lilac" emoji="✨" />
      </div>

      {assessments.length ? (
        <div className="stagger mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assessments.map((a) => {
            const taken = a.assessment_results.length;
            const avg = taken
              ? Math.round(
                  (a.assessment_results.reduce((s, r) => s + Number(r.percentage), 0) / taken) * 10,
                ) / 10
              : null;
            return (
              <Link key={a.id} href={`/assessments/${a.id}`}>
                <article
                  className={`lift h-full rounded-card p-5 ${LEVEL_TONE[a.level] ?? "bg-surface text-foreground"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide opacity-70">{a.subject}</p>
                    {a.ai_generated ? (
                      <span className="grid size-7 place-items-center rounded-full bg-white/60 dark:bg-white/10">
                        <Sparkles className="size-3.5" />
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-1.5 text-base font-bold leading-snug">{a.title}</h3>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-white/60 px-2.5 py-1 font-semibold dark:bg-white/10">
                      {LEVEL_LABELS[a.level] ?? a.level}
                    </span>
                    <span className="rounded-full bg-white/60 px-2.5 py-1 font-semibold dark:bg-white/10">
                      {a.total_marks} marks
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2 text-xs opacity-80">
                    <span>
                      {taken ? `${taken} marked` : "not taken yet"}
                      {avg != null ? ` · avg ${avg}%` : ""}
                    </span>
                    <span>{formatDate(a.created_at)}</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="mt-5 p-6">
          <EmptyState
            title="No papers yet"
            description="Generate one pitched at a learning level, print it, then photograph the completed sheets to record scores."
            emoji="✍️"
            action={
              <Link href="/assessments/new">
                <Button>
                  <Sparkles /> Generate a paper
                </Button>
              </Link>
            }
          />
        </Card>
      )}

      <div className="mt-5 rounded-card bg-surface-2 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          How grading works <span aria-hidden>🔍</span>
        </h3>
        <ol className="mt-2 grid gap-2 text-sm text-muted sm:grid-cols-4">
          {[
            "Generate a paper for a learning level and print it.",
            "Children answer on paper — no device needed.",
            "Photograph the sheet; vision OCR reads the handwriting.",
            "A volunteer confirms or corrects every row before it is saved.",
          ].map((step, i) => (
            <li key={i} className="rounded-base bg-surface p-3">
              <span className="mb-1 grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
