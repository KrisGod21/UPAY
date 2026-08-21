import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer, Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { LEVEL_LABELS, formatDate } from "@/lib/utils";
import type { Assessment } from "@/lib/types";
import { SheetGrader } from "./grader";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();

  const { data } = await supabase.from("assessments").select("*").eq("id", id).single();
  if (!data) notFound();
  const assessment = data as Assessment;

  const [{ data: students }, { data: results }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, student_code")
      .eq("center_id", assessment.center_id ?? profile.center_id ?? "")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("assessment_results")
      .select("id, score, max_score, percentage, taken_on, graded_by_ai, students(full_name, student_code)")
      .eq("assessment_id", id)
      .order("percentage", { ascending: false }),
  ]);

  const marked = (results ?? []) as unknown as {
    id: string;
    score: number;
    max_score: number;
    percentage: number;
    taken_on: string;
    graded_by_ai: boolean;
    students: { full_name: string; student_code: string } | null;
  }[];

  const average = marked.length
    ? Math.round((marked.reduce((s, r) => s + Number(r.percentage), 0) / marked.length) * 10) / 10
    : null;

  return (
    <>
      <Link
        href="/assessments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All assessments
      </Link>

      <PageHeader
        title={assessment.title}
        description={`${assessment.subject} · ${LEVEL_LABELS[assessment.level] ?? assessment.level} · ${assessment.total_marks} marks`}
        action={
          assessment.ai_generated ? (
            <Badge tone="lilac">
              <Sparkles className="size-3" /> AI generated
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>The paper</CardTitle>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Printer className="size-3.5" /> Print this page to hand it out
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {assessment.questions.map((q) => (
                  <li key={q.n} className="rounded-card bg-surface-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">
                        <span className="mr-2 text-muted">{q.n}.</span>
                        {q.prompt}
                      </p>
                      <Badge tone={q.type === "mcq" ? "sky" : "butter"}>
                        {q.marks} mark{q.marks === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    {q.options?.length ? (
                      <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                        {q.options.map((opt, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold">
                              {"ABCD"[i]}
                            </span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2.5 h-9 rounded-base border-2 border-dashed border-border" />
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Results</CardTitle>
                {average != null ? (
                  <Badge tone={average >= 60 ? "mint" : average >= 40 ? "butter" : "danger"}>
                    class average {average}%
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {marked.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Child</Th>
                      <Th>Score</Th>
                      <Th>Percent</Th>
                      <Th>Graded</Th>
                      <Th>Taken</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {marked.map((r) => (
                      <tr key={r.id}>
                        <Td>
                          <span className="font-semibold">{r.students?.full_name ?? "—"}</span>
                          <p className="text-xs text-muted">{r.students?.student_code}</p>
                        </Td>
                        <Td className="tnum">
                          {r.score}/{r.max_score}
                        </Td>
                        <Td>
                          <Badge
                            tone={
                              Number(r.percentage) >= 60
                                ? "mint"
                                : Number(r.percentage) >= 40
                                  ? "butter"
                                  : "danger"
                            }
                          >
                            {r.percentage}%
                          </Badge>
                        </Td>
                        <Td className="text-xs text-muted">
                          {r.graded_by_ai ? "AI, unedited" : "volunteer corrected"}
                        </Td>
                        <Td className="tnum text-muted">{formatDate(r.taken_on)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="p-5">
                  <EmptyState
                    title="Nobody has taken this yet"
                    description="Photograph a completed sheet on the right to record the first result."
                    emoji="📄"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <SheetGrader assessmentId={assessment.id} students={students ?? []} />
      </div>
    </>
  );
}
