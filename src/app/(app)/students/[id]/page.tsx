import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, ScanFace, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ChartFrame, BarsChart } from "@/components/charts";
import { LEVEL_LABELS, formatDate, initials } from "@/lib/utils";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const [{ data: student }, { data: progress }] = await Promise.all([
    supabase
      .from("students")
      .select("*, centers(name, code, zone_id)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("v_student_progress").select("*").eq("student_id", id).maybeSingle(),
  ]);

  if (!student) notFound();

  const [{ data: attendance }, { data: results }] = await Promise.all([
    supabase
      .from("attendance")
      .select("id, status, method, confidence, class_sessions(session_date, subject)")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("assessment_results")
      .select("id, score, max_score, percentage, taken_on, ai_feedback, assessments(title, subject)")
      .eq("student_id", id)
      .order("taken_on", { ascending: false }),
  ]);

  const records = (attendance ?? []) as unknown as {
    id: string;
    status: string;
    method: string;
    confidence: number | null;
    class_sessions: { session_date: string; subject: string | null } | null;
  }[];

  const marks = (results ?? []) as unknown as {
    id: string;
    score: number;
    max_score: number;
    percentage: number;
    taken_on: string;
    ai_feedback: string | null;
    assessments: { title: string; subject: string } | null;
  }[];

  const scoreChart = [...marks]
    .reverse()
    .map((r) => ({ paper: r.assessments?.subject ?? "Paper", score: Number(r.percentage) }));

  const centre = (student as unknown as { centers: { name: string; code: string } | null }).centers;
  const enrolled = Array.isArray(student.face_descriptor) && student.face_descriptor.length === 128;
  const latest = marks[0];

  return (
    <>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sky text-lg font-extrabold text-sky-ink">
          {initials(student.full_name)}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{student.full_name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {student.student_code} · {centre?.name ?? "No centre"} ·{" "}
            {LEVEL_LABELS[student.level] ?? student.level}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Badge tone={student.active ? "mint" : "neutral"}>
            {student.active ? "Active" : "Inactive"}
          </Badge>
          <Badge tone={enrolled ? "accent" : "neutral"}>
            <ScanFace className="size-3" /> {enrolled ? "Face enrolled" : "Face not enrolled"}
          </Badge>
        </div>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Attendance"
          value={progress?.attendance_rate != null ? `${progress.attendance_rate}%` : "—"}
          sub="across every session"
          tone={
            (progress?.attendance_rate ?? 0) >= 70
              ? "mint"
              : (progress?.attendance_rate ?? 0) >= 55
                ? "butter"
                : "peach"
          }
          emoji="🙋"
        />
        <Stat
          label="Average score"
          value={progress?.avg_score != null ? `${progress.avg_score}%` : "—"}
          sub={`${marks.length} paper${marks.length === 1 ? "" : "s"} taken`}
          tone={(progress?.avg_score ?? 0) >= 60 ? "mint" : "butter"}
          emoji="📈"
        />
        <Stat label="Enrolled since" value={formatDate(student.enrolled_on)} tone="lilac" emoji="🗓️" />
        <Stat
          label="Latest result"
          value={latest ? `${latest.score}/${latest.max_score}` : "—"}
          sub={latest?.assessments?.title}
          tone="sky"
          emoji="📄"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {scoreChart.length ? (
            <ChartFrame
              title="Assessment history"
              description="Every paper this child has taken, oldest first."
              rows={scoreChart}
              columns={[
                { key: "paper", label: "Paper" },
                { key: "score", label: "Score %" },
              ]}
              height={240}
            >
              <BarsChart data={scoreChart} x="paper" series={[{ key: "score", label: "Score %" }]} unit="%" />
            </ChartFrame>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent attendance</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {records.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Subject</Th>
                      <Th>Status</Th>
                      <Th>Marked</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 20).map((r) => (
                      <tr key={r.id}>
                        <Td className="tnum whitespace-nowrap">
                          {formatDate(r.class_sessions?.session_date)}
                        </Td>
                        <Td className="text-muted">{r.class_sessions?.subject ?? "—"}</Td>
                        <Td>
                          <Badge
                            tone={r.status === "present" ? "mint" : r.status === "late" ? "butter" : "danger"}
                          >
                            {r.status}
                          </Badge>
                        </Td>
                        <Td className="text-xs text-muted">
                          {r.method === "face" ? (
                            <span className="flex items-center gap-1.5 text-accent">
                              <ScanFace className="size-3.5" />
                              by face
                              {r.confidence != null ? ` · ${Math.round(r.confidence * 100)}%` : ""}
                            </span>
                          ) : (
                            "by hand"
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="p-5">
                  <EmptyState title="No attendance recorded yet" emoji="🗓️" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold">Guardian</h3>
            <p className="mt-2 text-sm">{student.guardian_name ?? "Not recorded"}</p>
            {student.guardian_phone ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Phone className="size-3.5" /> {student.guardian_phone}
              </p>
            ) : null}
            {student.notes ? <p className="mt-3 text-sm text-muted">{student.notes}</p> : null}
          </Card>

          {latest?.ai_feedback ? (
            <Card className="bg-mint p-5 text-mint-ink">
              <h3 className="font-bold">What to practise next</h3>
              <p className="mt-2 text-sm">{latest.ai_feedback}</p>
              <p className="mt-3 text-xs opacity-70">
                Written from the questions this child got wrong, and checked by the volunteer who
                saved the result.
              </p>
            </Card>
          ) : null}

          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <ShieldCheck className="size-4" /> Face data
            </h3>
            <p className="mt-2 text-sm text-muted">
              {enrolled
                ? "A 128-number embedding is stored for attendance matching. No photograph of this child exists in the system."
                : "Not enrolled. Their face will be offered for naming the next time a class photo is taken at this centre."}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
