import Link from "next/link";
import { TrendingDown, UserMinus, ArrowRight, ScanFace, MapPin, Sparkles } from "lucide-react";
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
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { ChartFrame, TrendChart, BarsChart, MiniBar } from "@/components/charts";
import { LEVEL_LABELS } from "@/lib/utils";

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
  const weekly = toWeekly(daily);
  const declining = decliningCenters(centers).slice(0, 5);
  const atRisk = atRiskStudents(students).slice(0, 8);
  const understaffed = understaffedCenters(centers).slice(0, 5);
  const topVolunteers = volunteers.slice(0, 6);

  const centreBars = [...centers]
    .filter((c) => c.attendance_30d != null)
    .sort((a, b) => (b.attendance_30d ?? 0) - (a.attendance_30d ?? 0))
    .slice(0, 10)
    .map((c) => ({ name: c.center_name, rate: c.attendance_30d }));

  const isField = profile.role === "volunteer" || profile.role === "teacher";
  const maxHours = Math.max(1, ...topVolunteers.map((v) => Number(v.total_hours)));

  return (
    <>
      <PageHeader
        title={`Good to see you, ${profile.full_name.split(" ")[0]}`}
        description={
          profile.role === "admin"
            ? "Programme-wide view across every zone."
            : profile.role === "coordinator"
              ? "Your zone, at a glance."
              : "Your centre, at a glance."
        }
        action={
          isField ? (
            <div className="flex gap-2">
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
            </div>
          ) : (
            <Link href="/upaygpt">
              <Button variant="outline">
                <Sparkles /> Ask UpayGPT
              </Button>
            </Link>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active students" value={headline.students} sub={`${headline.centers} centres`} tone="primary" />
        <Stat
          label="Attendance (30 days)"
          value={`${headline.attendance30}%`}
          sub={`${headline.sessions30} sessions held`}
          tone={headline.attendance30 >= 70 ? "success" : headline.attendance30 >= 55 ? "warning" : "danger"}
        />
        <Stat label="Volunteers & teachers" value={headline.volunteers} sub="Assigned to a centre" tone="accent" />
        <Stat
          label="Service hours this month"
          value={headline.hoursThisMonth.toLocaleString("en-IN")}
          sub="Geo-verified check-ins"
          tone="neutral"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
          description="Last 30 days, highest first."
          rows={centreBars}
          columns={[
            { key: "name", label: "Centre" },
            { key: "rate", label: "Attendance %" },
          ]}
        >
          <BarsChart data={centreBars} x="name" series={[{ key: "rate", label: "Attendance %" }]} unit="%" horizontal />
        </ChartFrame>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="size-4 text-danger" />
              Centres losing attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {declining.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Centre</Th>
                    <Th>Previous 30d</Th>
                    <Th>Last 30d</Th>
                    <Th>Change</Th>
                  </tr>
                </thead>
                <tbody>
                  {declining.map((c) => {
                    const drop = (c.attendance_prev_30d ?? 0) - (c.attendance_30d ?? 0);
                    return (
                      <tr key={c.center_id}>
                        <Td>
                          <Link href={`/centers/${c.center_id}`} className="font-medium hover:text-primary">
                            {c.center_name}
                          </Link>
                          <p className="text-xs text-muted">{c.zone_name}</p>
                        </Td>
                        <Td className="tnum text-muted">{c.attendance_prev_30d}%</Td>
                        <Td className="tnum font-medium">{c.attendance_30d}%</Td>
                        <Td>
                          <Badge tone={drop >= 15 ? "danger" : "warning"}>−{drop.toFixed(1)} pts</Badge>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="No centre is slipping" description="Every centre held or improved its attendance against the previous month." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="size-4 text-warning" />
              Children who need attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRisk.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Child</Th>
                    <Th>Centre</Th>
                    <Th>Attendance</Th>
                    <Th>Avg score</Th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((s) => (
                    <tr key={s.student_id}>
                      <Td>
                        <Link href={`/students/${s.student_id}`} className="font-medium hover:text-primary">
                          {s.full_name}
                        </Link>
                        <p className="text-xs text-muted">{LEVEL_LABELS[s.level] ?? s.level}</p>
                      </Td>
                      <Td className="text-muted">{s.center_name}</Td>
                      <Td className="tnum">{s.attendance_rate ?? "—"}%</Td>
                      <Td className="tnum">{s.avg_score ?? "—"}%</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="Nobody is flagged" description="No child is below the attendance or score thresholds." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volunteers by service hours</CardTitle>
          </CardHeader>
          <CardContent>
            {topVolunteers.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Volunteer</Th>
                    <Th>Centre</Th>
                    <Th>Hours</Th>
                    <Th>Verified</Th>
                  </tr>
                </thead>
                <tbody>
                  {topVolunteers.map((v) => (
                    <tr key={v.volunteer_id}>
                      <Td>
                        <Link href={`/volunteers/${v.volunteer_id}`} className="font-medium hover:text-primary">
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
              <EmptyState title="No check-ins yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Centres short of volunteers</CardTitle>
            <p className="text-xs text-muted">More than 12 children per volunteer.</p>
          </CardHeader>
          <CardContent>
            {understaffed.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Centre</Th>
                    <Th>Children</Th>
                    <Th>Volunteers</Th>
                    <Th>Ratio</Th>
                  </tr>
                </thead>
                <tbody>
                  {understaffed.map((c) => (
                    <tr key={c.center_id}>
                      <Td>
                        <Link href={`/centers/${c.center_id}`} className="font-medium hover:text-primary">
                          {c.center_name}
                        </Link>
                        <p className="text-xs text-muted">{c.zone_name}</p>
                      </Td>
                      <Td className="tnum">{c.students}</Td>
                      <Td className="tnum">{c.volunteers}</Td>
                      <Td>
                        <Badge tone="warning">
                          {Math.round(c.students / Math.max(1, c.volunteers))}:1
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="Staffing looks healthy" description="Every centre is within the target ratio." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 bg-accent-soft/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Have a question this dashboard does not answer?</p>
            <p className="text-sm text-muted">
              Ask UpayGPT in plain language. It writes the query, runs it, and shows you the SQL.
            </p>
          </div>
          <Link href="/upaygpt">
            <Button variant="outline">
              Open UpayGPT <ArrowRight />
            </Button>
          </Link>
        </div>
      </Card>
    </>
  );
}
