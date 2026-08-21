"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { assessEligibility, certificateSerial } from "@/lib/certificates";

const issueSchema = z.object({ volunteerId: z.string().uuid() });

export async function issueCertificate(input: { volunteerId: string }) {
  const parsed = issueSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That volunteer is not valid." };

  // Only an administrator issues certificates — the eligibility rule decides
  // who qualifies, but a person still signs it off.
  const { supabase } = await requireRole(["admin"]);

  const { data: stat } = await supabase
    .from("v_volunteer_stats")
    .select("*")
    .eq("volunteer_id", parsed.data.volunteerId)
    .single();

  if (!stat) return { ok: false as const, error: "That volunteer has no service record." };

  const eligibility = assessEligibility({
    totalHours: Number(stat.total_hours ?? 0),
    shifts: Number(stat.shifts ?? 0),
    verifiedShifts: Number(stat.verified_shifts ?? 0),
    sessionsLed: Number(stat.sessions_led ?? 0),
    joinedOn: stat.joined_on,
  });

  if (!eligibility.eligible || !eligibility.type) {
    return {
      ok: false as const,
      error: `Not yet eligible — needs ${eligibility.shortfall ?? "more service"}.`,
    };
  }

  const { count } = await supabase.from("certificates").select("id", { count: "exact", head: true });

  const { error } = await supabase.from("certificates").insert({
    volunteer_id: parsed.data.volunteerId,
    cert_type: eligibility.type,
    serial: certificateSerial((count ?? 0) + 1),
    hours: Number(Number(stat.total_hours ?? 0).toFixed(2)),
    sessions_count: Number(stat.shifts ?? 0),
    period_start: stat.joined_on,
    period_end: new Date().toISOString().slice(0, 10),
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/certificates");
  return { ok: true as const, type: eligibility.type };
}
