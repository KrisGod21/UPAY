import Link from "next/link";
import { ScanFace } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getStudentProgress } from "@/lib/queries";
import { Badge, Card, CardContent, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/utils";
import { StudentFilters } from "./filters";

export const metadata = { title: "Students — UPAY Footpathshala" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; centre?: string }>;
}) {
  const { profile, supabase } = await requireProfile();
  const { q, level, centre } = await searchParams;

  const [students, { data: enrolled }] = await Promise.all([
    getStudentProgress(supabase, profile),
    supabase.from("students").select("id, face_descriptor"),
  ]);

  const enrolledIds = new Set(
    (enrolled ?? []).filter((s) => s.face_descriptor != null).map((s) => s.id as string),
  );

  const centres = [...new Set(students.map((s) => s.center_name))].sort();

  const filtered = students.filter((s) => {
    if (q && !`${s.full_name} ${s.student_code}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (level && s.level !== level) return false;
    if (centre && s.center_name !== centre) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Students"
        description={`${students.length} children enrolled · ${enrolledIds.size} with a face enrolled for attendance.`}
      />

      <StudentFilters centres={centres} />

      <Card className="mt-4">
        <CardContent className="p-0">
          {filtered.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Child</Th>
                  <Th>Centre</Th>
                  <Th>Level</Th>
                  <Th>Attendance</Th>
                  <Th>Avg score</Th>
                  <Th>Assessments</Th>
                  <Th>Face</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((s) => (
                  <tr key={s.student_id}>
                    <Td>
                      <Link href={`/students/${s.student_id}`} className="font-medium hover:text-primary">
                        {s.full_name}
                      </Link>
                      <p className="text-xs text-muted">{s.student_code}</p>
                    </Td>
                    <Td className="text-muted">{s.center_name}</Td>
                    <Td>
                      <Badge tone="neutral">{LEVEL_LABELS[s.level] ?? s.level}</Badge>
                    </Td>
                    <Td>
                      {s.attendance_rate != null ? (
                        <Badge
                          tone={
                            s.attendance_rate >= 70 ? "success" : s.attendance_rate >= 55 ? "warning" : "danger"
                          }
                        >
                          {s.attendance_rate}%
                        </Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td className="tnum">{s.avg_score != null ? `${s.avg_score}%` : "—"}</Td>
                    <Td className="tnum text-muted">{s.assessments_taken}</Td>
                    <Td>
                      {enrolledIds.has(s.student_id) ? (
                        <span className="flex items-center gap-1 text-xs text-accent">
                          <ScanFace className="size-3.5" /> enrolled
                        </span>
                      ) : (
                        <span className="text-xs text-muted">not enrolled</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No children match that filter"
                description="Clear the search or pick a different centre."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length > 300 ? (
        <p className="mt-3 text-xs text-muted">
          Showing the first 300 of {filtered.length}. Narrow the filters to see the rest.
        </p>
      ) : null}
    </>
  );
}
