import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Award } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { assessEligibility, CERT_LABELS } from "@/lib/certificates";
import {
  Badge,
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
import { formatDate, ROLE_LABELS, initials } from "@/lib/utils";

export default async function VolunteerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const { data: stat } = await supabase
    .from("v_volunteer_stats")
    .select("*")
    .eq("volunteer_id", id)
    .maybeSingle();

  if (!stat) notFound();

  const [{ data: shifts }, { data: certs }] = await Promise.all([
    supabase
      .from("volunteer_checkins")
      .select("id, check_in_at, check_out_at, hours, distance_m, location_verified, centers(name)")
      .eq("volunteer_id", id)
      .order("check_in_at", { ascending: false })
      .limit(25),
    supabase
      .from("certificates")
      .select("id, serial, cert_type, hours, issued_on")
      .eq("volunteer_id", id)
      .order("issued_on", { ascending: false }),
  ]);

  const recent = (shifts ?? []) as unknown as {
    id: string;
    check_in_at: string;
    check_out_at: string | null;
    hours: number;
    distance_m: number | null;
    location_verified: boolean;
    centers: { name: string } | null;
  }[];

  const eligibility = assessEligibility({
    totalHours: Number(stat.total_hours ?? 0),
    shifts: Number(stat.shifts ?? 0),
    verifiedShifts: Number(stat.verified_shifts ?? 0),
    sessionsLed: Number(stat.sessions_led ?? 0),
    joinedOn: stat.joined_on,
  });

  const nextMilestone = Number(stat.total_hours) >= 100 ? 250 : 100;
  const progress = Math.min(100, (Number(stat.total_hours) / nextMilestone) * 100);
  const onSite = stat.shifts ? Math.round((stat.verified_shifts / stat.shifts) * 100) : 0;

  return (
    <>
      <Link
        href="/volunteers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All volunteers
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-lilac text-lg font-extrabold text-lilac-ink">
          {initials(stat.full_name)}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{stat.full_name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {ROLE_LABELS[stat.role] ?? stat.role}
            {stat.center_name ? ` · ${stat.center_name}` : ""}
            {stat.joined_on ? ` · joined ${formatDate(stat.joined_on)}` : ""}
          </p>
        </div>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Service hours" value={Math.round(Number(stat.total_hours))} tone="sky" emoji="⏱️" />
        <Stat label="Shifts" value={stat.shifts} tone="lilac" emoji="📝" />
        <Stat
          label="On site"
          value={`${onSite}%`}
          sub="inside the centre radius"
          tone={onSite >= 85 ? "mint" : "butter"}
          emoji="📍"
        />
        <Stat label="Classes led" value={stat.sessions_led} tone="butter" emoji="📚" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent shifts</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {recent.length ? (
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
                  {recent.map((s) => (
                    <tr key={s.id}>
                      <Td className="tnum whitespace-nowrap">{formatDate(s.check_in_at)}</Td>
                      <Td>{s.centers?.name ?? "—"}</Td>
                      <Td className="tnum">{s.check_out_at ? Number(s.hours).toFixed(1) : "open"}</Td>
                      <Td className="tnum text-muted">
                        {s.distance_m != null ? `${Math.round(s.distance_m)} m` : "—"}
                      </Td>
                      <Td>
                        {s.location_verified ? (
                          <Badge tone="mint">
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
              <div className="p-5">
                <EmptyState title="No shifts logged" emoji="⏱️" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <Award className="size-4" /> Recognition
            </h3>
            <div className="mt-4">
              <Meter
                value={progress}
                tone={eligibility.eligible ? "mint" : "butter"}
                label={`Progress towards ${nextMilestone} hours`}
              />
              <p className="mt-2 text-sm">
                {eligibility.eligible ? (
                  <span className="font-semibold text-success">{eligibility.label}</span>
                ) : (
                  <span className="text-muted">Needs {eligibility.shortfall}</span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">
                {Math.round(Number(stat.total_hours))} of {nextMilestone} hours ·{" "}
                {eligibility.tenureDays} days with the programme
              </p>
            </div>
          </Card>

          {certs?.length ? (
            <Card className="p-5">
              <h3 className="font-bold">Certificates</h3>
              <ul className="mt-3 space-y-2">
                {certs.map((c) => (
                  <li key={c.id} className="rounded-card bg-butter p-3 text-butter-ink">
                    <p className="text-sm font-bold">{CERT_LABELS[c.cert_type as never]}</p>
                    <p className="tnum mt-0.5 text-xs opacity-80">
                      {c.serial} · {formatDate(c.issued_on)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
