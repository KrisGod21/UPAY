import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AttendanceCapture } from "./capture";

export const metadata = { title: "Take attendance — UPAY Footpathshala" };

export default async function NewAttendancePage() {
  const { profile, supabase } = await requireProfile();

  let query = supabase.from("centers").select("id, name, lat, lng, radius_m").eq("active", true).order("name");
  if (profile.role === "coordinator" && profile.zone_id) query = query.eq("zone_id", profile.zone_id);
  else if (profile.role !== "admin" && profile.center_id) query = query.eq("id", profile.center_id);

  const { data: centers } = await query;

  return (
    <>
      <PageHeader
        title="Take attendance"
        description="One class photograph marks the register. Review it before saving — the volunteer has the last word, not the model."
      />
      <AttendanceCapture centers={centers ?? []} defaultCenterId={profile.center_id} />
    </>
  );
}
