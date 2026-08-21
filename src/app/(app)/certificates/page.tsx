import { requireProfile } from "@/lib/auth";
import { getVolunteerStats } from "@/lib/queries";
import { PageHeader, Stat } from "@/components/ui";
import { assessEligibility } from "@/lib/certificates";
import { CertificateList, type CandidateRow, type IssuedCertificate } from "./certificate-list";

export const metadata = { title: "Certificates — UPAY Footpathshala" };

export default async function CertificatesPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: certs }, volunteers] = await Promise.all([
    supabase
      .from("certificates")
      .select("id, volunteer_id, serial, cert_type, hours, sessions_count, issued_on, profiles(full_name, centers(name))")
      .order("issued_on", { ascending: false })
      .limit(60),
    getVolunteerStats(supabase, profile),
  ]);

  const issued: IssuedCertificate[] = ((certs ?? []) as unknown as {
    id: string;
    serial: string;
    cert_type: IssuedCertificate["cert_type"];
    hours: number;
    sessions_count: number;
    issued_on: string;
    profiles: { full_name: string; centers: { name: string } | null } | null;
  }[]).map((c) => ({
    id: c.id,
    serial: c.serial,
    cert_type: c.cert_type,
    hours: Number(c.hours),
    sessions_count: c.sessions_count,
    issued_on: c.issued_on,
    volunteer_name: c.profiles?.full_name ?? "Unknown volunteer",
    center_name: c.profiles?.centers?.name ?? null,
  }));

  const issuedIds = new Set(
    ((certs ?? []) as unknown as { volunteer_id: string }[]).map((c) => c.volunteer_id),
  );

  // Show anyone who has actually turned up, ordered by how close they are.
  const candidates: CandidateRow[] = volunteers
    .filter((v) => Number(v.total_hours) > 0)
    .sort((a, b) => Number(b.total_hours) - Number(a.total_hours))
    .slice(0, 12)
    .map((v) => ({
      volunteer_id: v.volunteer_id,
      full_name: v.full_name,
      center_name: v.center_name,
      total_hours: Number(v.total_hours),
      shifts: Number(v.shifts),
      verified_shifts: Number(v.verified_shifts),
      sessions_led: Number(v.sessions_led),
      joined_on: v.joined_on,
      already_issued: issuedIds.has(v.volunteer_id),
    }));

  const eligibleCount = volunteers.filter(
    (v) =>
      assessEligibility({
        totalHours: Number(v.total_hours),
        shifts: Number(v.shifts),
        verifiedShifts: Number(v.verified_shifts),
        sessionsLed: Number(v.sessions_led),
        joinedOn: v.joined_on,
      }).eligible,
  ).length;

  const totalHours = volunteers.reduce((s, v) => s + Number(v.total_hours), 0);

  return (
    <>
      <PageHeader
        title="Certificates"
        emoji="🏅"
        description="Service hours accumulate automatically. Eligible volunteers are recognised without anyone chasing a spreadsheet."
      />

      <div className="stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Certificates issued" value={issued.length} tone="butter" emoji="🏅" />
        <Stat label="Eligible now" value={eligibleCount} sub="meet a milestone" tone="mint" emoji="✅" />
        <Stat label="Volunteers tracked" value={volunteers.length} tone="lilac" emoji="🤝" />
        <Stat
          label="Hours recognised"
          value={Math.round(totalHours).toLocaleString("en-IN")}
          tone="sky"
          emoji="⏱️"
        />
      </div>

      <CertificateList issued={issued} candidates={candidates} canIssue={profile.role === "admin"} />
    </>
  );
}
