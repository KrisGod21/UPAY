import Link from "next/link";
import {
  ArrowRight,
  ScanFace,
  MapPin,
  Sparkles,
  TrendingDown,
  UserMinus,
  UsersRound,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  getCenterStats,
  getStudentProgress,
  getVolunteerStats,
  getAttendanceDaily,
  getHeadline,
  toWeekly,
  decliningCenters,
  atRiskStudents,
  understaffedCenters,
} from "@/lib/queries";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Meter,
  PageHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ChartFrame, TrendChart, BarsChart, MiniBar } from "@/components/charts";
import { PlanTrack, type PlanItem } from "@/components/plan-track";
import { LEVEL_LABELS, formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard — UPAY Footpathshala" };

export default async function DashboardPage() {
  const { profile, supabase } = await requireProfile();

  const [centers, students, volunteers, daily] = await Promise.all([
    getCenterStats(supabase, profile),
    getStudentProgress(supabase, profile),
    getVolunteerStats(supabase, profile),
    getAttendanceDaily(supabase, profile, 120),
  ]);

  const headline = await getHeadline(supabase, profile, centers);

  // The lesson plan for the centre this person actually works at.
  const planCenterId = profile.center_id ?? centers[0]?.center_id ?? null;
  const { data: plan } = planCenterId
    ? await supabase
        .from("center_curriculum")
        .select("id, scheduled_for, status, curriculum_units(title, subject, description, duration_min)")
        .eq("center_id", planCenterId)
        .order("scheduled_for", { ascending: false })
        .limit(5)
    : { data: [] };

  const planItems: PlanItem[] = ((plan ?? []) as unknown as {
    id: string;
    scheduled_for: string;
    status: PlanItem["status"];
    curriculum_units: { title: string; subject: string; description: string | null; duration_min: number } | null;
  }[])
    .filter((p) => p.curriculum_units)
    .map((p) => ({
      id: p.id,
      title: p.curriculum_units!.title,
      subject: p.curriculum_units!.subject,
      description: p.curriculum_units!.description,
      when: formatDate(p.scheduled_for),
      status: p.status,
      durationMin: p.curriculum_units!.duration_min,
      href: "/curriculum",
    }));

  const weekly = toWeekly(daily);
  const declining = decliningCenters(centers).slice(0, 4);
  const atRisk = atRiskStudents(students).slice(0, 6);
  const understaffed = understaffedCenters(centers).slice(0, 4);
  const topVolunteers = volunteers.slice(0, 6);

  const centreBars = [...centers]
    .filter((c) => c.attendance_30d != null)
    .sort((a, b) => (b.attendance_30d ?? 0) - (a.attendance_30d ?? 0))
    .slice(0, 10)
    .map((c) => ({ name: c.center_name, rate: c.attendance_30d }));

  const isField = profile.role === "volunteer" || profile.role === "teacher";
  const maxHours = Math.max(1, ...topVolunteers.map((v) => Number(v.total_hours)));
  const delivered = planItems.filter((p) => p.status === "delivered").length;

  return (
    <>
      <PageHeader
        title={`Hello, ${profile.full_name.split(" ")[0]}`}
        emoji="👋"
        description={
          profile.role === "admin"
            ? "Every zone, every centre — and what needs you today."
            : profile.role === "coordinator"
              ? "Your zone at a glance, with the problems surfaced first."
              : "Your centre today."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {isField ? (
              <>
                <Link href="/checkin">
                  <Button variant="outline">
                    <MapPin /> Check in
                  </Button>
                </Link>
                <Link href="/attendance/new">
                  <Button>
                    <ScanFace /> Take attendance
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/upaygpt">
                <Button>
                  <Sparkles /> Ask UpayGPT
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* ------------------------------------------------------ stat tiles */}
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Children enrolled"
          value={headline.students}
          sub={`across ${headline.centers} centre${headline.centers === 1 ? "" : "s"}`}
          tone="sky"
          emoji="🧒"
        />
        <Stat
          label="Attendance, last 30 days"
          value={`${headline.attendance30}%`}
          sub={`${headline.sessions30} sessions held`}
          tone={headline.attendance30 >= 70 ? "mint" : headline.attendance30 >= 55 ? "butter" : "peach"}
          emoji={headline.attendance30 >= 70 ? "🎉" : "👀"}
        />
        <Stat
          label="Volunteers & teachers"
          value={headline.volunteers}
          sub="assigned to a centre"
          tone="lilac"
          emoji="🤝"
        />
        <Stat
          label="Service hours this month"
          value={headline.hoursThisMonth.toLocaleString("en-IN")}
          sub="geo-verified check-ins"
          tone="butter"
          emoji="⏱️"
        />
      </div>

      {/* -------------------------------------------- plan + charts + rail */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title="Attendance trend"
              description="Weekly share of marked children who were present."
              rows={weekly}
              columns={[
                { key: "week", label: "Week of" },
                { key: "rate", label: "Attendance %" },
                { key: "marked", label: "Records" },
              ]}
            >
              <TrendChart data={weekly} x="week" series={[{ key: "rate", label: "Attendance %" }]} area />
            </ChartFrame>

            <ChartFrame
              title="Attendance by centre"
              description="Last 30 days, strongest first."
              rows={centreBars}
              columns={[
                { key: "name", label: "Centre" },
                { key: "rate", label: "Attendance %" },
              ]}
            >
              <BarsChart
                data={centreBars}
                x="name"
                series={[{ key: "rate", label: "Attendance %" }]}
                unit="%"
                horizontal
              />
            </ChartFrame>
          </div>

          {/* Lesson plan track */}
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                  Lesson plan <span aria-hidden>📚</span>
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  What this centre was scheduled to teach, and what actually happened.
                </p>
              </div>
              <Link href="/curriculum">
                <Button variant="outline" size="sm">
                  Curriculum <ArrowRight />
                </Button>
              </Link>
            </div>

            {planItems.length ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <Meter value={(delivered / planItems.length) * 100} label="Lessons delivered" />
                  <span className="tnum shrink-0 text-xs font-semibold text-muted">
                    {delivered}/{planItems.length} delivered
                  </span>
                </div>
                <PlanTrack items={planItems} />
              </>
            ) : (
              <EmptyState
                title="No lessons scheduled"
                description="Schedule curriculum units to a centre and they will appear here."
                emoji="📖"
              />
            )}
          </Card>

          {/* Volunteers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-4" /> Volunteers by service hours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {topVolunteers.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Volunteer</Th>
                      <Th>Centre</Th>
                      <Th>Hours</Th>
                      <Th>On site</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVolunteers.map((v) => (
                      <tr key={v.volunteer_id}>
                        <Td>
                          <Link href={`/volunteers/${v.volunteer_id}`} className="font-semibold hover:text-primary">
                            {v.full_name}
                          </Link>
                        </Td>
                        <Td className="text-muted">{v.center_name ?? "—"}</Td>
                        <Td>
                          <MiniBar value={Number(v.total_hours)} max={maxHours} />
                        </Td>
                        <Td className="tnum text-muted">
                          {v.shifts ? Math.round((v.verified_shifts / v.shifts) * 100) : 0}%
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="p-5">
                  <EmptyState title="No check-ins yet" emoji="⏱️" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------- attention rail */}
        <aside className="space-y-4">
          <h2 className="flex items-center gap-2 px-1 text-lg font-extrabold tracking-tight">
            Needs you <span className="animate-float" aria-hidden>🔍</span>
          </h2>

          <div className="stagger space-y-3">
            {declining.map((c) => {
              const drop = (c.attendance_prev_30d ?? 0) - (c.attendance_30d ?? 0);
              return (
                <Link key={c.center_id} href={`/centers/${c.center_id}`} className="block">
                  <div className="lift rounded-card bg-peach p-4 text-peach-ink shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                        <TrendingDown className="size-3.5" /> Attendance falling
                      </span>
                      <span className="tnum text-xs font-bold">−{drop.toFixed(1)} pts</span>
                    </div>
                    <p className="mt-2 font-bold">{c.center_name}</p>
                    <p className="mt-1 text-sm opacity-85">
                      Down from {c.attendance_prev_30d}% to {c.attendance_30d}% against its own
                      previous month.
                    </p>
                  </div>
                </Link>
              );
            })}

            {atRisk.length ? (
              <div className="rounded-card bg-butter p-4 text-butter-ink shadow-[var(--shadow-card)]">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <UserMinus className="size-3.5" /> Children falling behind
                </span>
                <ul className="mt-2.5 space-y-1.5">
                  {atRisk.map((s) => (
                    <li key={s.student_id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/students/${s.student_id}`} className="truncate font-semibold hover:underline">
                        {s.full_name}
                      </Link>
                      <span className="tnum shrink-0 text-xs opacity-80">
                        {s.attendance_rate ?? "—"}% · {LEVEL_LABELS[s.level] ?? s.level}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/students" className="mt-3 inline-flex items-center gap-1 text-xs font-bold hover:underline">
                  See every child <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : null}

            {understaffed.map((c) => (
              <Link key={c.center_id} href={`/centers/${c.center_id}`} className="block">
                <div className="lift rounded-card bg-sky p-4 text-sky-ink shadow-[var(--shadow-card)]">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                    <UsersRound className="size-3.5" /> Short of volunteers
                  </span>
                  <p className="mt-2 font-bold">{c.center_name}</p>
                  <p className="mt-1 text-sm opacity-85">
                    {c.students} children to {c.volunteers} volunteer{c.volunteers === 1 ? "" : "s"} —
                    about {Math.round(c.students / Math.max(1, c.volunteers))} to one.
                  </p>
                </div>
              </Link>
            ))}

            {!declining.length && !atRisk.length && !understaffed.length ? (
              <EmptyState
                title="Nothing is flagged"
                description="No centre is slipping, no child is below threshold, and staffing is within target."
                emoji="🎉"
              />
            ) : null}
          </div>

          <Link href="/upaygpt" className="block">
            <div className="lift rounded-card bg-lilac p-4 text-lilac-ink shadow-[var(--shadow-card)]">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                <Sparkles className="size-3.5" /> UpayGPT
              </span>
              <p className="mt-2 text-sm">
                Ask anything this page does not answer. It writes the query, runs it, and shows you
                the SQL.
              </p>
              <Badge tone="lilac" className="mt-3 bg-white/60 dark:bg-white/10">
                &ldquo;Which centres need volunteers?&rdquo;
              </Badge>
            </div>
          </Link>
        </aside>
      </div>
    </>
  );
}
