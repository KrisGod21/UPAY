import { requireProfile } from "@/lib/auth";
import { PageHeader, Stat } from "@/components/ui";
import { CurriculumManager, type ScheduleRow, type UnitRow } from "./manager";

export const metadata = { title: "Curriculum — UPAY Footpathshala" };

export default async function CurriculumPage() {
  const { profile, supabase } = await requireProfile();

  let centersQuery = supabase.from("centers").select("id, name").eq("active", true).order("name");
  if (profile.role === "coordinator" && profile.zone_id) centersQuery = centersQuery.eq("zone_id", profile.zone_id);

  const [{ data: units }, { data: schedule }, { data: centers }] = await Promise.all([
    supabase
      .from("curriculum_units")
      .select("id, title, subject, level, description, duration_min, center_curriculum(id, status)")
      .order("subject")
      .order("sequence_no"),
    supabase
      .from("center_curriculum")
      .select("id, scheduled_for, status, centers(name), curriculum_units(title, subject)")
      .order("scheduled_for", { ascending: false })
      .limit(80),
    centersQuery,
  ]);

  const unitRows: UnitRow[] = ((units ?? []) as unknown as {
    id: string;
    title: string;
    subject: string;
    level: string;
    description: string | null;
    duration_min: number;
    center_curriculum: { id: string; status: string }[];
  }[]).map((u) => ({
    id: u.id,
    title: u.title,
    subject: u.subject,
    level: u.level,
    description: u.description,
    duration_min: u.duration_min,
    scheduled: u.center_curriculum.length,
    delivered: u.center_curriculum.filter((c) => c.status === "delivered").length,
  }));

  const scheduleRows: ScheduleRow[] = ((schedule ?? []) as unknown as {
    id: string;
    scheduled_for: string;
    status: ScheduleRow["status"];
    centers: { name: string } | null;
    curriculum_units: { title: string; subject: string } | null;
  }[])
    .filter((s) => s.curriculum_units)
    .map((s) => ({
      id: s.id,
      scheduled_for: s.scheduled_for,
      status: s.status,
      center_name: s.centers?.name ?? "—",
      unit_title: s.curriculum_units!.title,
      unit_subject: s.curriculum_units!.subject,
    }));

  const totalScheduled = scheduleRows.length;
  const totalDelivered = scheduleRows.filter((s) => s.status === "delivered").length;
  const missed = scheduleRows.filter((s) => s.status === "skipped").length;
  const coverage = totalScheduled ? Math.round((totalDelivered / totalScheduled) * 100) : 0;

  const canEdit = ["admin", "coordinator", "teacher"].includes(profile.role);

  return (
    <>
      <PageHeader
        title="Curriculum"
        emoji="📚"
        description="Build a lesson once, schedule it across centres, and see which lessons were genuinely delivered."
      />

      <div className="stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Lesson units" value={unitRows.length} tone="sky" emoji="📖" />
        <Stat label="Scheduled" value={totalScheduled} sub="most recent 80" tone="lilac" emoji="🗓️" />
        <Stat
          label="Delivery rate"
          value={`${coverage}%`}
          sub={`${totalDelivered} delivered`}
          tone={coverage >= 80 ? "mint" : "butter"}
          emoji={coverage >= 80 ? "🎉" : "👀"}
        />
        <Stat label="Missed sessions" value={missed} tone={missed ? "peach" : "mint"} emoji="🌧️" />
      </div>

      <CurriculumManager
        units={unitRows}
        schedule={scheduleRows}
        centers={centers ?? []}
        canEdit={canEdit}
      />
    </>
  );
}
