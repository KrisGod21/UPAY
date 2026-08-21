import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getCenterStats } from "@/lib/queries";
import { Badge, Card, EmptyState, PageHeader, Meter } from "@/components/ui";

export const metadata = { title: "Zones — UPAY Footpathshala" };

const TONES = [
  "bg-sky text-sky-ink",
  "bg-mint text-mint-ink",
  "bg-lilac text-lilac-ink",
  "bg-butter text-butter-ink",
  "bg-peach text-peach-ink",
  "bg-pink text-pink-ink",
];

export default async function ZonesPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: zones }, centers] = await Promise.all([
    supabase.from("zones").select("id, name, city, state, profiles(full_name)").order("name"),
    getCenterStats(supabase, profile),
  ]);

  const rows = (zones ?? []).map((z, i) => {
    const own = centers.filter((c) => c.zone_id === z.id);
    const students = own.reduce((s, c) => s + Number(c.students ?? 0), 0);
    const volunteers = own.reduce((s, c) => s + Number(c.volunteers ?? 0), 0);
    const weighted = own.reduce(
      (acc, c) => {
        if (c.attendance_30d == null) return acc;
        const w = Number(c.sessions_30d ?? 0);
        return { sum: acc.sum + c.attendance_30d * w, w: acc.w + w };
      },
      { sum: 0, w: 0 },
    );
    const attendance = weighted.w ? Math.round((weighted.sum / weighted.w) * 10) / 10 : 0;

    return {
      id: z.id as string,
      name: z.name as string,
      city: z.city as string,
      state: z.state as string,
      coordinator:
        (z as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? null,
      centres: own.length,
      students,
      volunteers,
      attendance,
      tone: TONES[i % TONES.length],
    };
  });

  return (
    <>
      <PageHeader
        title="Zones"
        emoji="🗺️"
        description="The top of the hierarchy — each zone holds its centres, and each centre its children."
      />

      {rows.length ? (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((z) => (
            <article key={z.id} className={`lift rounded-card p-5 ${z.tone}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold leading-snug">{z.name}</h3>
                  <p className="text-xs font-medium opacity-75">
                    {z.city}, {z.state}
                  </p>
                </div>
                <Badge className="bg-white/60 dark:bg-white/10">{z.attendance}%</Badge>
              </div>

              <div className="mt-4">
                <Meter
                  value={z.attendance}
                  tone={z.attendance >= 70 ? "mint" : z.attendance >= 55 ? "butter" : "peach"}
                  label={`${z.name} attendance`}
                />
                <p className="mt-1.5 text-xs opacity-75">Attendance over the last 30 days</p>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [z.centres, "centres"],
                  [z.students, "children"],
                  [z.volunteers, "volunteers"],
                ].map(([value, label]) => (
                  <div key={String(label)} className="rounded-base bg-white/60 py-2 dark:bg-white/10">
                    <dt className="tnum text-lg font-extrabold leading-none">{value}</dt>
                    <dd className="mt-1 text-[11px] font-medium opacity-75">{label}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 flex items-center gap-1.5 text-xs opacity-80">
                <Users className="size-3.5" />
                {z.coordinator ? `Coordinated by ${z.coordinator}` : "No coordinator assigned"}
              </p>

              <Link
                href="/centers"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
              >
                <Building2 className="size-3.5" /> See its centres
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState title="No zones yet" description="Zones organise centres by city." emoji="🗺️" />
        </Card>
      )}
    </>
  );
}
