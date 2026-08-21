import Link from "next/link";
import { Building2, TrendingDown, TrendingUp } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getCenterStats } from "@/lib/queries";
import { Badge, Card, CardContent, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { MiniBar } from "@/components/charts";

export const metadata = { title: "Centres — UPAY Footpathshala" };

export default async function CentersPage() {
  const { profile, supabase } = await requireProfile();
  const centers = await getCenterStats(supabase, profile);

  const maxStudents = Math.max(1, ...centers.map((c) => c.students));

  return (
    <>
      <PageHeader
        title="Centres"
        description={`${centers.length} learning centre${centers.length === 1 ? "" : "s"} across the programme.`}
      />

      <Card>
        <CardContent className="p-0">
          {centers.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Centre</Th>
                  <Th>Zone</Th>
                  <Th>Children</Th>
                  <Th>Volunteers</Th>
                  <Th>Sessions (30d)</Th>
                  <Th>Attendance</Th>
                  <Th>Trend</Th>
                  <Th>Avg score</Th>
                </tr>
              </thead>
              <tbody>
                {centers.map((c) => {
                  const delta =
                    c.attendance_30d != null && c.attendance_prev_30d != null
                      ? c.attendance_30d - c.attendance_prev_30d
                      : null;
                  return (
                    <tr key={c.center_id}>
                      <Td>
                        <Link href={`/centers/${c.center_id}`} className="font-medium hover:text-primary">
                          {c.center_name}
                        </Link>
                        <p className="text-xs text-muted">{c.code}</p>
                      </Td>
                      <Td className="text-muted">{c.zone_name}</Td>
                      <Td>
                        <MiniBar value={c.students} max={maxStudents} />
                      </Td>
                      <Td className="tnum">{c.volunteers}</Td>
                      <Td className="tnum">{c.sessions_30d}</Td>
                      <Td>
                        {c.attendance_30d != null ? (
                          <Badge
                            tone={
                              c.attendance_30d >= 70 ? "success" : c.attendance_30d >= 55 ? "warning" : "danger"
                            }
                          >
                            {c.attendance_30d}%
                          </Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </Td>
                      <Td>
                        {delta == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span
                            className={`tnum flex items-center gap-1 text-xs ${
                              delta >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                            {delta >= 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </span>
                        )}
                      </Td>
                      <Td className="tnum text-muted">{c.avg_score != null ? `${c.avg_score}%` : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No centres yet"
                description="Centres appear here once they are registered against a zone."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Building2 className="size-3.5" />
        Trend compares the last 30 days against the 30 before it, at the same centre — not against
        other centres, which start from very different baselines.
      </p>
    </>
  );
}
