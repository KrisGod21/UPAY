import { requireProfile } from "@/lib/auth";
import {
  getCenterStats,
  getStudentProgress,
  getVolunteerStats,
  getAttendanceWeekly,
  rollUpWeekly,
} from "@/lib/queries";
import { PageHeader, Stat, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { ChartFrame, TrendChart, BarsChart, SharePie } from "@/components/charts";
import { LEVEL_LABELS } from "@/lib/utils";

export const metadata = { title: "Analytics — UPAY Footpathshala" };

export default async function AnalyticsPage() {
  const { profile, supabase } = await requireProfile();

  const [centers, students, volunteers, weeklyPoints] = await Promise.all([
    getCenterStats(supabase, profile),
    getStudentProgress(supabase, profile),
    getVolunteerStats(supabase, profile),
    getAttendanceWeekly(supabase, profile, 180),
  ]);

  /* ---------------------------------------------------- zone comparison */

  const byZone = new Map<string, { students: number; present: number; marked: number; centers: number }>();
  for (const c of centers) {
    const z = byZone.get(c.zone_name) ?? { students: 0, present: 0, marked: 0, centers: 0 };
    z.students += Number(c.students ?? 0);
    z.centers += 1;
    byZone.set(c.zone_name, z);
  }
  const zoneByCenterId = new Map(centers.map((c) => [c.center_id, c.zone_name]));
  for (const d of weeklyPoints) {
    const zoneName = zoneByCenterId.get(d.center_id);
    if (!zoneName) continue;
    const z = byZone.get(zoneName);
    if (!z) continue;
    z.present += d.present;
    z.marked += d.marked;
  }

  const zoneRows = [...byZone.entries()]
    .map(([zone, v]) => ({
      zone,
      attendance: v.marked ? Math.round((v.present / v.marked) * 1000) / 10 : 0,
      children: v.students,
      centres: v.centers,
    }))
    .sort((a, b) => b.attendance - a.attendance);

  /* ------------------------------------------------------ level spread */

  const levelCounts = new Map<string, number>();
  for (const s of students) levelCounts.set(s.level, (levelCounts.get(s.level) ?? 0) + 1);
  const levelRows = Object.keys(LEVEL_LABELS)
    .filter((k) => levelCounts.has(k))
    .map((k) => ({ level: LEVEL_LABELS[k], children: levelCounts.get(k) ?? 0 }));

  /* -------------------------------------------- how registers are marked */

  // Counted in the rollup rather than by pulling thousands of raw rows across
  // the network only to tally them in JavaScript.
  const methodByWeek = new Map<string, { face: number; manual: number }>();
  for (const p of weeklyPoints) {
    const b = methodByWeek.get(p.week) ?? { face: 0, manual: 0 };
    b.face += Number(p.by_face ?? 0);
    b.manual += Number(p.by_hand ?? 0);
    methodByWeek.set(p.week, b);
  }

  const methodRowsChart = [...methodByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, b]) => ({
      week: new Date(week).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      "By face": b.face,
      "By hand": b.manual,
    }));

  /* ------------------------------------------------------ score buckets */

  const buckets = [
    { band: "0–20%", children: 0 },
    { band: "21–40%", children: 0 },
    { band: "41–60%", children: 0 },
    { band: "61–80%", children: 0 },
    { band: "81–100%", children: 0 },
  ];
  for (const s of students) {
    if (s.avg_score == null) continue;
    const i = Math.min(4, Math.floor(Number(s.avg_score) / 20.0001));
    buckets[i].children += 1;
  }

  /* -------------------------------------------------- volunteer hours */

  const hoursByCentre = new Map<string, number>();
  for (const v of volunteers) {
    if (!v.center_name) continue;
    hoursByCentre.set(v.center_name, (hoursByCentre.get(v.center_name) ?? 0) + Number(v.total_hours));
  }
  const hoursRows = [...hoursByCentre.entries()]
    .map(([centre, hours]) => ({ centre, hours: Math.round(hours) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const weekly = rollUpWeekly(weeklyPoints);
  const totalHours = volunteers.reduce((s, v) => s + Number(v.total_hours), 0);
  const scored = students.filter((s) => s.avg_score != null);
  const avgScore = scored.length
    ? Math.round((scored.reduce((s, x) => s + Number(x.avg_score), 0) / scored.length) * 10) / 10
    : 0;
  const totalMarked = weeklyPoints.reduce((s, p) => s + Number(p.marked ?? 0), 0);
  const totalByFace = weeklyPoints.reduce((s, p) => s + Number(p.by_face ?? 0), 0);
  const faceShare = totalMarked ? Math.round((totalByFace / totalMarked) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        emoji="📊"
        description="Six months of programme data, cut the ways that change a decision."
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Children tracked" value={students.length} tone="sky" emoji="🧒" />
        <Stat label="Volunteer hours" value={Math.round(totalHours).toLocaleString("en-IN")} tone="lilac" emoji="⏱️" />
        <Stat
          label="Average assessment"
          value={`${avgScore}%`}
          sub={`${scored.length} children assessed`}
          tone={avgScore >= 60 ? "mint" : "butter"}
          emoji="📈"
        />
        <Stat
          label="Registers marked by face"
          value={`${faceShare}%`}
          sub="over the last six months"
          tone="peach"
          emoji="📸"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Attendance over time"
          description="Weekly, across every centre in your scope."
          rows={weekly}
          columns={[
            { key: "week", label: "Week of" },
            { key: "rate", label: "Attendance %" },
            { key: "marked", label: "Records" },
          ]}
          height={280}
        >
          <TrendChart data={weekly} x="week" series={[{ key: "rate", label: "Attendance %" }]} area />
        </ChartFrame>

        <ChartFrame
          title="Attendance by zone"
          description="Six-month average, strongest first."
          rows={zoneRows}
          columns={[
            { key: "zone", label: "Zone" },
            { key: "attendance", label: "Attendance %" },
            { key: "children", label: "Children" },
            { key: "centres", label: "Centres" },
          ]}
          height={280}
        >
          <BarsChart
            data={zoneRows}
            x="zone"
            series={[{ key: "attendance", label: "Attendance %" }]}
            unit="%"
            horizontal
          />
        </ChartFrame>

        <ChartFrame
          title="How registers are marked"
          description="Face recognition replacing manual roll-call, week by week."
          rows={methodRowsChart}
          columns={[
            { key: "week", label: "Week of" },
            { key: "By face", label: "By face" },
            { key: "By hand", label: "By hand" },
          ]}
          height={280}
        >
          <BarsChart
            data={methodRowsChart}
            x="week"
            series={[
              { key: "By face", label: "By face" },
              { key: "By hand", label: "By hand" },
            ]}
            stacked
          />
        </ChartFrame>

        <ChartFrame
          title="Assessment score spread"
          description="Children grouped by their average across all papers taken."
          rows={buckets}
          columns={[
            { key: "band", label: "Score band" },
            { key: "children", label: "Children" },
          ]}
          height={280}
        >
          <BarsChart data={buckets} x="band" series={[{ key: "children", label: "Children" }]} />
        </ChartFrame>

        <ChartFrame
          title="Volunteer hours by centre"
          description="Where the programme's effort actually lands."
          rows={hoursRows}
          columns={[
            { key: "centre", label: "Centre" },
            { key: "hours", label: "Hours" },
          ]}
          height={300}
        >
          <BarsChart data={hoursRows} x="centre" series={[{ key: "hours", label: "Hours" }]} horizontal />
        </ChartFrame>

        <ChartFrame
          title="Children by learning level"
          description="Level reflects what a child can do, not their age."
          rows={levelRows}
          columns={[
            { key: "level", label: "Level" },
            { key: "children", label: "Children" },
          ]}
          height={300}
        >
          <SharePie data={levelRows} nameKey="level" valueKey="children" />
        </ChartFrame>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Zone summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {zoneRows.map((z) => (
              <div key={z.zone} className="rounded-card bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{z.zone}</p>
                  <Badge tone={z.attendance >= 70 ? "mint" : z.attendance >= 55 ? "butter" : "danger"}>
                    {z.attendance}%
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-muted">
                  {z.children} children · {z.centres} centre{z.centres === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
