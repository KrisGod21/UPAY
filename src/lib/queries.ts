import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type SB = Awaited<ReturnType<typeof createClient>>;

export interface CenterStat {
  center_id: string;
  center_name: string;
  code: string;
  zone_id: string;
  zone_name: string;
  lat: number | null;
  lng: number | null;
  active: boolean;
  students: number;
  volunteers: number;
  sessions_30d: number;
  attendance_30d: number | null;
  attendance_prev_30d: number | null;
  avg_score: number | null;
}

export interface StudentProgress {
  student_id: string;
  full_name: string;
  student_code: string;
  level: string;
  center_id: string;
  center_name: string;
  zone_id: string;
  attendance_rate: number | null;
  avg_score: number | null;
  assessments_taken: number;
}

export interface VolunteerStat {
  volunteer_id: string;
  full_name: string;
  email: string | null;
  role: string;
  center_id: string | null;
  center_name: string | null;
  zone_id: string | null;
  joined_on: string | null;
  total_hours: number;
  shifts: number;
  verified_shifts: number;
  last_seen: string | null;
  sessions_led: number;
}

/** Restricts a query to the centres this profile may see. */
interface Filterable<T> {
  eq(column: string, value: string): T;
}

function scope<T extends Filterable<T>>(query: T, profile: Profile, column = "center_id"): T {
  if (profile.role === "admin") return query;
  if (profile.role === "coordinator" && profile.zone_id) return query.eq("zone_id", profile.zone_id);
  if (profile.center_id) return query.eq(column, profile.center_id);
  return query;
}

export async function getCenterStats(supabase: SB, profile: Profile): Promise<CenterStat[]> {
  const { data } = await scope(
    supabase.from("v_center_stats").select("*").order("center_name"),
    profile,
  );
  return (data ?? []) as CenterStat[];
}

export async function getStudentProgress(
  supabase: SB,
  profile: Profile,
): Promise<StudentProgress[]> {
  const { data } = await scope(
    supabase.from("v_student_progress").select("*").order("full_name"),
    profile,
  );
  return (data ?? []) as StudentProgress[];
}

export async function getVolunteerStats(supabase: SB, profile: Profile): Promise<VolunteerStat[]> {
  const { data } = await scope(
    supabase.from("v_volunteer_stats").select("*").order("total_hours", { ascending: false }),
    profile,
  );
  return (data ?? []) as VolunteerStat[];
}

export interface DailyPoint {
  session_date: string;
  center_id: string;
  center_name: string;
  zone_id: string;
  marked: number;
  present: number;
  attendance_rate: number | null;
}

export async function getAttendanceDaily(
  supabase: SB,
  profile: Profile,
  sinceDays = 120,
): Promise<DailyPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const { data } = await scope(
    supabase
      .from("v_attendance_daily")
      .select("*")
      .gte("session_date", since.toISOString().slice(0, 10))
      .order("session_date"),
    profile,
  );
  return (data ?? []) as DailyPoint[];
}

/** Collapses daily points into weekly programme-wide attendance. */
export function toWeekly(points: DailyPoint[]): { week: string; rate: number; marked: number }[] {
  const buckets = new Map<string, { present: number; marked: number }>();
  for (const p of points) {
    const d = new Date(p.session_date);
    // Monday-anchored week key.
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    const key = d.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { present: 0, marked: 0 };
    b.present += p.present;
    b.marked += p.marked;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, b]) => ({
      week: new Date(week).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      rate: b.marked ? Math.round((b.present / b.marked) * 1000) / 10 : 0,
      marked: b.marked,
    }));
}

export interface Headline {
  students: number;
  centers: number;
  volunteers: number;
  attendance30: number;
  sessions30: number;
  hoursThisMonth: number;
}

export async function getHeadline(
  supabase: SB,
  profile: Profile,
  centers: CenterStat[],
): Promise<Headline> {
  const students = centers.reduce((s, c) => s + Number(c.students ?? 0), 0);
  const volunteers = centers.reduce((s, c) => s + Number(c.volunteers ?? 0), 0);
  const sessions30 = centers.reduce((s, c) => s + Number(c.sessions_30d ?? 0), 0);

  // Weight each centre's rate by how many sessions it actually ran, so a tiny
  // centre with one perfect session cannot drag the programme average upward.
  const weighted = centers.reduce(
    (acc, c) => {
      const rate = c.attendance_30d;
      if (rate == null) return acc;
      const w = Number(c.sessions_30d ?? 0);
      return { sum: acc.sum + rate * w, w: acc.w + w };
    },
    { sum: 0, w: 0 },
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  const { data: hours } = await supabase
    .from("volunteer_checkins")
    .select("hours")
    .gte("check_in_at", monthStart.toISOString());

  return {
    students,
    centers: centers.length,
    volunteers,
    sessions30,
    attendance30: weighted.w ? Math.round((weighted.sum / weighted.w) * 10) / 10 : 0,
    hoursThisMonth: Math.round((hours ?? []).reduce((s, h) => s + Number(h.hours ?? 0), 0)),
  };
}

/** Centres whose 30-day attendance dropped meaningfully against the prior 30. */
export function decliningCenters(centers: CenterStat[], minDrop = 5): CenterStat[] {
  return centers
    .filter(
      (c) =>
        c.attendance_30d != null &&
        c.attendance_prev_30d != null &&
        c.attendance_prev_30d - c.attendance_30d >= minDrop,
    )
    .sort(
      (a, b) =>
        b.attendance_prev_30d! - b.attendance_30d! - (a.attendance_prev_30d! - a.attendance_30d!),
    );
}

/** Children attending poorly or scoring poorly — either alone warrants a look. */
export function atRiskStudents(students: StudentProgress[]): StudentProgress[] {
  return students
    .filter(
      (s) =>
        (s.attendance_rate != null && s.attendance_rate < 55) ||
        (s.avg_score != null && s.avg_score < 40),
    )
    .sort((a, b) => (a.attendance_rate ?? 100) - (b.attendance_rate ?? 100));
}

/** Centres carrying more children per volunteer than the programme can sustain. */
export function understaffedCenters(centers: CenterStat[], ratio = 12): CenterStat[] {
  return centers
    .filter((c) => c.students > 0 && c.students / Math.max(1, c.volunteers) > ratio)
    .sort((a, b) => b.students / Math.max(1, b.volunteers) - a.students / Math.max(1, a.volunteers));
}
