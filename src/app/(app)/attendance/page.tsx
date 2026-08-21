import Link from "next/link";
import { ScanFace, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Badge, Button, Card, CardContent, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { formatDate, pct } from "@/lib/utils";

export const metadata = { title: "Attendance — UPAY Footpathshala" };

interface SessionRow {
  id: string;
  session_date: string;
  subject: string | null;
  faces_detected: number;
  auto_matched: number;
  lat: number | null;
  centers: { name: string; zone_id: string } | null;
  profiles: { full_name: string } | null;
  attendance: { status: string }[];
}

export default async function AttendancePage() {
  const { profile, supabase } = await requireProfile();

  let query = supabase
    .from("class_sessions")
    .select(
      "id, session_date, subject, faces_detected, auto_matched, lat, centers(name, zone_id), profiles(full_name), attendance(status)",
    )
    .order("session_date", { ascending: false })
    .limit(60);

  if (profile.role !== "admin" && profile.center_id && profile.role !== "coordinator") {
    query = query.eq("center_id", profile.center_id);
  }

  const { data } = await query;
  const sessions = (data ?? []) as unknown as SessionRow[];

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Every class session recorded, and how the register was marked."
        action={
          <Link href="/attendance/new">
            <Button>
              <ScanFace /> Take attendance
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-0">
          {sessions.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Centre</Th>
                  <Th>Subject</Th>
                  <Th>Present</Th>
                  <Th>Rate</Th>
                  <Th>How it was marked</Th>
                  <Th>Conducted by</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const total = s.attendance.length;
                  const present = s.attendance.filter((a) => a.status !== "absent").length;
                  const rate = pct(present, total);
                  return (
                    <tr key={s.id}>
                      <Td className="tnum whitespace-nowrap">{formatDate(s.session_date)}</Td>
                      <Td className="font-medium">{s.centers?.name ?? "—"}</Td>
                      <Td className="text-muted">{s.subject ?? "—"}</Td>
                      <Td className="tnum">
                        {present} / {total}
                      </Td>
                      <Td>
                        <Badge tone={rate >= 70 ? "success" : rate >= 55 ? "warning" : "danger"}>{rate}%</Badge>
                      </Td>
                      <Td>
                        {s.faces_detected > 0 ? (
                          <span className="flex items-center gap-1.5 text-xs text-accent">
                            <ScanFace className="size-3.5" />
                            {s.auto_matched} of {s.faces_detected} faces
                          </span>
                        ) : (
                          <span className="text-xs text-muted">By hand</span>
                        )}
                      </Td>
                      <Td className="text-muted">
                        <span className="flex items-center gap-1.5">
                          {s.profiles?.full_name ?? "—"}
                          {s.lat != null ? <MapPin className="size-3 text-success" /> : null}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No sessions recorded yet"
                description="Take a class photograph to mark your first register."
                action={
                  <Link href="/attendance/new">
                    <Button>
                      <ScanFace /> Take attendance
                    </Button>
                  </Link>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
