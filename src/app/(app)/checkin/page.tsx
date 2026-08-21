import { MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { CheckinPanel } from "./panel";

export const metadata = { title: "Check in — UPAY Footpathshala" };

export default async function CheckinPage() {
  const { profile, supabase } = await requireProfile();

  let centersQuery = supabase.from("centers").select("id, name, lat, lng, radius_m").eq("active", true).order("name");
  if (profile.role === "coordinator" && profile.zone_id) centersQuery = centersQuery.eq("zone_id", profile.zone_id);

  const [{ data: centers }, { data: openShift }, { data: recent }] = await Promise.all([
    centersQuery,
    supabase
      .from("volunteer_checkins")
      .select("id, check_in_at, centers(name)")
      .eq("volunteer_id", profile.id)
      .is("check_out_at", null)
      .order("check_in_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("volunteer_checkins")
      .select("id, check_in_at, check_out_at, hours, distance_m, location_verified, centers(name)")
      .eq("volunteer_id", profile.id)
      .not("check_out_at", "is", null)
      .order("check_in_at", { ascending: false })
      .limit(20),
  ]);

  const shifts = (recent ?? []) as unknown as {
    id: string;
    check_in_at: string;
    check_out_at: string;
    hours: number;
    distance_m: number | null;
    location_verified: boolean;
    centers: { name: string } | null;
  }[];

  const totalHours = shifts.reduce((s, x) => s + Number(x.hours ?? 0), 0);
  const verified = shifts.filter((s) => s.location_verified).length;

  const open = openShift
    ? {
        id: (openShift as { id: string }).id,
        check_in_at: (openShift as { check_in_at: string }).check_in_at,
        center_name:
          (openShift as unknown as { centers: { name: string } | null }).centers?.name ?? "your centre",
      }
    : null;

  return (
    <>
      <PageHeader
        title="Volunteer check-in"
        description="Log where and when you worked. Hours accumulate towards your certificate."
      />

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <CheckinPanel centers={centers ?? []} defaultCenterId={profile.center_id} openShift={open} />

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Recent hours" value={totalHours.toFixed(1)} sub="Last 20 shifts" tone="sky" emoji="⏱" />
            <Stat label="Shifts logged" value={shifts.length} tone="lilac" emoji="📝" />
            <Stat
              label="Geo-verified"
              value={shifts.length ? `${Math.round((verified / shifts.length) * 100)}%` : "—"}
              sub="Within the centre radius"
              tone="mint"
              emoji="📍"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your recent shifts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {shifts.length ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Centre</Th>
                      <Th>Hours</Th>
                      <Th>Distance</Th>
                      <Th>Verified</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s.id}>
                        <Td className="tnum whitespace-nowrap">{formatDate(s.check_in_at)}</Td>
                        <Td>{s.centers?.name ?? "—"}</Td>
                        <Td className="tnum">{Number(s.hours).toFixed(1)}</Td>
                        <Td className="tnum text-muted">
                          {s.distance_m != null ? `${Math.round(s.distance_m)} m` : "—"}
                        </Td>
                        <Td>
                          {s.location_verified ? (
                            <Badge tone="success">
                              <MapPin className="size-3" /> on site
                            </Badge>
                          ) : (
                            <Badge tone="warning">unverified</Badge>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="p-6">
                  <EmptyState title="No completed shifts yet" description="Check in above to log your first one." />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
