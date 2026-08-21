import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AssessmentGenerator } from "./generator";

export const metadata = { title: "Generate a paper — UPAY Footpathshala" };

export default async function NewAssessmentPage() {
  const { profile, supabase } = await requireProfile();

  let query = supabase.from("centers").select("id, name").eq("active", true).order("name");
  if (profile.role === "coordinator" && profile.zone_id) query = query.eq("zone_id", profile.zone_id);
  else if (profile.role !== "admin" && profile.center_id) query = query.eq("id", profile.center_id);

  const { data: centers } = await query;

  return (
    <>
      <PageHeader
        title="Generate a paper"
        emoji="✍️"
        description="Written for a child's learning level rather than their age, with the answer key saved alongside it."
      />
      <AssessmentGenerator centers={centers ?? []} defaultCenterId={profile.center_id} />
    </>
  );
}
