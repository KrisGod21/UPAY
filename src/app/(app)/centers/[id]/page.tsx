import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ScanFace, TrendingDown, TrendingUp } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  Badge,
  Button,
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
import { ChartFrame, TrendChart } from "@/components/charts";
import { LEVEL_LABELS, formatDate } from "@/lib/utils";
import { toWeekly, type DailyPoint } from "@/lib/queries";

export default async function CenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const { data: stat } = await supabase
    .from("v_center_stats")
    .select("*")
    .eq("center_id", id)
    .maybeSingle();

  if (!stat) notFound();

  const since = new Date();
  since.setDate(since.getDate() - 120);

  const [{ data: daily }, { data: students }, { data: staff }, { data: sessions }] = await Promise.all([
    supabase
      .from("v_attendance_daily")
      .select("*")
      .eq("center_id", id)
      .gte("session_date", since.toISOString().slice(0, 10))
      .order("session_date"),
    supabase
      .from("v_student_progress")
      .select("*")
      .eq("center_id", id)
      .order("attendance_rate", { ascending: true })
      .limit(40),
    supabase
      .from("v_volunteer_stats")
      .select("volunteer_id, full_name, total_hours, shifts, verified_shifts")
      .eq("center_id", id)
      .order("total_hours", { ascending: false }),
    supabase
      .from("class_sessions")
      .select("id, session_date, subject, faces_detected, auto_matched, attendance(status)")
      .eq("center_id", id)
      .order("session_date", { ascending: false })
      .limit(12),
  ]);

  const weekly = toWeekly((daily ?? []) as DailyPoint[]);
  const delta =
    stat.attendance_30d != null && stat.attendance_prev_30d != null
      ? stat.attendance_30d - stat.attendance_prev_30d
      : null;

  const recentSessions = (sessions ?? []) as unknown as {
    id: string;
    session_date: string;
    subject: string | null;
    faces_detected: number;
    auto_matched: number;
    attendance: { status: string }[];
  }[];

  return (
    <>
      <Link
        href="/centers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All centres
      </Link>

      <PageHeader
        title={stat.center_name}
        description={`${stat.code} · ${stat.zone_name}`}
        action={
          <Link href="/attendance/new">
            <Button>
              <ScanFace /> Take attendance
            </Button>
          </Link>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Children" value={stat.students} tone="sky" emoji="🧒" />
        <Stat
          label="Attendance, 30 days"
          value={stat.attendance_30d != null ? `${stat.attendance_30d}%` : "—"}
          sub={
            delta != null
              ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts vs previous month`
              : undefined
          }
          tone={
            stat.attendance_30d == null
              ? "plain"
              : stat.attendance_30d >= 70
                ? "mint"
                : stat.attendance_30d >= 55
                  ? "butter"
                  : "peach"
          }
          emoji={delta != null && delta < 0 ? "📉" : "📈"}
        />
        <Stat label="Volunteers" value={stat.volunteers} tone="lilac" emoji="🤝" />
        <Stat label="Sessions, 30 days" value={stat.sessions_30d} tone="butter" emoji="🗓️" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <ChartFrame
            title="Attendance trend"
            description="Weekly, at this centre."
            rows={weekly}
            columns={[
              { key: "week", label: "Week of" },
              { key: "rate", label: "Attendance %" },
              { key: "marked", label: "Records" },
            ]}
            height={260}
            action={
              delta != null ? (
                <span
                  className={`tnum flex items-center gap-1 text-xs font-bold ${
                    delta >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)} pts
                </span>
              ) : null
            }
          >
            <TrendChart data={weekly} x="week" series={[{ key: "rate", label: "Attendance %" }]} area />
          </ChartFrame>

          <Card>
            <CardHeader>
              <CardTitle>Children needing attention</CardTitle>
              <p className="text-xs text-muted">Lowest attendance first.</p>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {students?.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Child</Th>
                      <Th>Level</Th>
                      <Th>Attendance</Th>
                      <Th>Avg score</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 12).map((s) => (
                      <tr key={s.student_id}>
                        <Td>
                          <Link href={`/students/${s.student_id}`} className="font-semibold hover:text-primary">
                            {s.full_name}
                          </Link>
                          <p className="text-xs text-muted">{s.student_code}</p>
                        </Td>
                        <Td className="text-muted">{LEVEL_LABELS[s.level] ?? s.level}</Td>
                        <Td>
                          <Badge
                            tone={
                              (s.attendance_rate ?? 0) >= 70
                                ? "mint"
                                : (s.attendance_rate ?? 0) >= 55
                                  ? "butter"
                                  : "danger"
                            }
                          >
                            {s.attendance_rate ?? "—"}%
                          </Badge>
                        </Td>
                        <Td className="tnum">{s.avg_score != null ? `${s.avg_score}%` : "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="p-5">
                  <EmptyState title="No children registered here yet" emoji="🧒" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <MapPin className="size-4" /> Location
            </h3>
            <p className="mt-2 text-sm text-muted">
              {stat.lat != null && stat.lng != null
                ? `${stat.lat.toFixed(5)}, ${stat.lng.toFixed(5)}`
                : "No coordinates recorded, so check-ins here cannot be geo-verified."}
            </p>
            {stat.lat != null && stat.lng != null ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${stat.lat}&mlon=${stat.lng}#map=17/${stat.lat}/${stat.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
              >
                Open in OpenStreetMap →
              </a>
            ) : null}
          </Card>

          <Card className="p-5">
            <h3 className="font-bold">Volunteers here</h3>
            <ul className="mt-3 space-y-2">
              {(staff ?? []).slice(0, 8).map((v) => (
                <li key={v.volunteer_id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/volunteers/${v.volunteer_id}`} className="truncate font-medium hover:text-primary">
                    {v.full_name}
                  </Link>
                  <span className="tnum shrink-0 text-xs text-muted">
                    {Math.round(Number(v.total_hours))} h
                  </span>
                </li>
              ))}
              {!staff?.length ? <li className="text-sm text-muted">Nobody assigned yet.</li> : null}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold">Recent sessions</h3>
            <ul className="mt-3 space-y-2">
              {recentSessions.map((s) => {
                const total = s.attendance.length;
                const present = s.attendance.filter((a) => a.status !== "absent").length;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.subject ?? "Session"}</span>
                      <span className="text-xs text-muted">{formatDate(s.session_date)}</span>
                    </span>
                    <span className="tnum shrink-0 text-xs text-muted">
                      {present}/{total}
                      {s.faces_detected > 0 ? ` · ${s.auto_matched} by face` : ""}
                    </span>
                  </li>
                );
              })}
              {!recentSessions.length ? (
                <li className="text-sm text-muted">No sessions recorded yet.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
