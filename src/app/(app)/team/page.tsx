import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, CardTitle, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { ROLE_LABELS, formatDate, initials } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export const metadata = { title: "People & roles — UPAY Footpathshala" };

const ROLE_TONE: Record<string, "sky" | "lilac" | "butter" | "mint" | "neutral"> = {
  admin: "sky",
  coordinator: "lilac",
  teacher: "butter",
  volunteer: "mint",
  student: "neutral",
};

/** What each role can reach. Mirrors the RLS policies, in plain English. */
const PERMISSIONS: { role: UserRole; scope: string; can: string }[] = [
  { role: "admin", scope: "Every zone", can: "Manage everything, issue certificates, import data" },
  { role: "coordinator", scope: "Their own zone", can: "Manage centres and volunteers, see zone analytics" },
  { role: "teacher", scope: "Their own centre", can: "Curriculum, assessments, attendance, progress" },
  { role: "volunteer", scope: "Their own centre", can: "Attendance, check-in, grade sheets" },
  { role: "student", scope: "Their own record", can: "View their own progress" },
];

export default async function TeamPage() {
  const { supabase } = await requireRole(["admin"]);

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, active, joined_on, centers(name), zones(name)")
    .order("role")
    .order("full_name")
    .limit(300);

  const people = (data ?? []) as unknown as {
    id: string;
    full_name: string;
    email: string | null;
    role: UserRole;
    phone: string | null;
    active: boolean;
    joined_on: string | null;
    centers: { name: string } | null;
    zones: { name: string } | null;
  }[];

  const counts = people.reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="People & roles"
        emoji="🛡️"
        description="Who has access to what. Enforced by row-level security in the database, not only by hiding menu items."
      />

      <div className="stagger mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Administrators" value={counts.admin ?? 0} tone="sky" emoji="🛡️" />
        <Stat label="Coordinators" value={counts.coordinator ?? 0} tone="lilac" emoji="🧭" />
        <Stat label="Teachers" value={counts.teacher ?? 0} tone="butter" emoji="📚" />
        <Stat label="Volunteers" value={counts.volunteer ?? 0} tone="mint" emoji="🤝" />
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> What each role can reach
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <thead>
              <tr>
                <Th>Role</Th>
                <Th>Data scope</Th>
                <Th>Can do</Th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.role}>
                  <Td>
                    <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABELS[p.role]}</Badge>
                  </Td>
                  <Td className="font-medium">{p.scope}</Td>
                  <Td className="text-muted">{p.can}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Everyone with an account</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Role</Th>
                <Th>Zone</Th>
                <Th>Centre</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-bold">
                        {initials(p.full_name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{p.full_name}</span>
                        <span className="block truncate text-xs text-muted">{p.email}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABELS[p.role]}</Badge>
                  </Td>
                  <Td className="text-muted">{p.zones?.name ?? "—"}</Td>
                  <Td className="text-muted">{p.centers?.name ?? "—"}</Td>
                  <Td className="tnum text-muted">{formatDate(p.joined_on)}</Td>
                  <Td>
                    <Badge tone={p.active ? "mint" : "neutral"}>{p.active ? "active" : "inactive"}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
