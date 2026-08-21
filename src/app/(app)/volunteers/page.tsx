import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getVolunteerStats } from "@/lib/queries";
import { Badge, Card, CardContent, EmptyState, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { MiniBar } from "@/components/charts";
import { formatDate, ROLE_LABELS, initials } from "@/lib/utils";
import { assessEligibility } from "@/lib/certificates";

export const metadata = { title: "Volunteers — UPAY Footpathshala" };

export default async function VolunteersPage() {
  const { profile, supabase } = await requireProfile();
  const volunteers = await getVolunteerStats(supabase, profile);

  const maxHours = Math.max(1, ...volunteers.map((v) => Number(v.total_hours)));
  const totalHours = volunteers.reduce((s, v) => s + Number(v.total_hours), 0);
  const active = volunteers.filter(
    (v) => v.last_seen && Date.now() - new Date(v.last_seen).getTime() < 30 * 86_400_000,
  ).length;
  const eligible = volunteers.filter(
    (v) =>
      assessEligibility({
        totalHours: Number(v.total_hours),
        shifts: Number(v.shifts),
        verifiedShifts: Number(v.verified_shifts),
        sessionsLed: Number(v.sessions_led),
        joinedOn: v.joined_on,
      }).eligible,
  ).length;

  return (
    <>
      <PageHeader
        title="Volunteers"
        emoji="🤝"
        description="Who is turning up, where, and how much of the teaching they are carrying."
      />

      <div className="stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Volunteers & teachers" value={volunteers.length} tone="lilac" emoji="🤝" />
        <Stat label="Active in last 30 days" value={active} tone="mint" emoji="✅" />
        <Stat label="Total hours" value={Math.round(totalHours).toLocaleString("en-IN")} tone="sky" emoji="⏱️" />
        <Stat label="Certificate-eligible" value={eligible} tone="butter" emoji="🏅" />
      </div>

      <Card>
        <CardContent className="p-0">
          {volunteers.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Volunteer</Th>
                  <Th>Centre</Th>
                  <Th>Role</Th>
                  <Th>Hours</Th>
                  <Th>Shifts</Th>
                  <Th>On site</Th>
                  <Th>Classes led</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((v) => {
                  const onSite = v.shifts ? Math.round((v.verified_shifts / v.shifts) * 100) : 0;
                  return (
                    <tr key={v.volunteer_id}>
                      <Td>
                        <Link
                          href={`/volunteers/${v.volunteer_id}`}
                          className="flex items-center gap-2.5 font-semibold hover:text-primary"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lilac text-[11px] font-bold text-lilac-ink">
                            {initials(v.full_name)}
                          </span>
                          {v.full_name}
                        </Link>
                      </Td>
                      <Td className="text-muted">{v.center_name ?? "—"}</Td>
                      <Td className="text-muted">{ROLE_LABELS[v.role] ?? v.role}</Td>
                      <Td>
                        <MiniBar value={Number(v.total_hours)} max={maxHours} />
                      </Td>
                      <Td className="tnum">{v.shifts}</Td>
                      <Td>
                        <Badge tone={onSite >= 85 ? "mint" : onSite >= 60 ? "butter" : "danger"}>
                          <MapPin className="size-3" />
                          {onSite}%
                        </Badge>
                      </Td>
                      <Td className="tnum">{v.sessions_led}</Td>
                      <Td className="tnum text-muted">{v.last_seen ? formatDate(v.last_seen) : "never"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No volunteers yet"
                description="Volunteers appear once they are registered against a centre."
                emoji="🤝"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 flex items-center gap-2 px-1 text-xs text-muted">
        <Sparkles className="size-3.5" />
        &ldquo;On site&rdquo; is the share of shifts that fell inside the centre&rsquo;s radius,
        recomputed on the server rather than taken from the device.
      </p>
    </>
  );
}
