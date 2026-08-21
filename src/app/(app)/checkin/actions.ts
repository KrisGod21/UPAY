"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { haversineMeters } from "@/lib/utils";

const checkInSchema = z.object({
  centerId: z.string().uuid(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

export async function checkIn(input: { centerId: string; lat: number | null; lng: number | null }) {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That check-in is not valid." };

  const { profile, supabase } = await requireProfile();

  const { data: open } = await supabase
    .from("volunteer_checkins")
    .select("id")
    .eq("volunteer_id", profile.id)
    .is("check_out_at", null)
    .limit(1);

  if (open?.length) {
    return { ok: false as const, error: "You are already checked in. Check out before starting a new shift." };
  }

  const { data: center } = await supabase
    .from("centers")
    .select("lat, lng, radius_m")
    .eq("id", parsed.data.centerId)
    .single();

  // Distance is recomputed on the server. A device can claim any coordinates,
  // but it cannot choose how far those coordinates are from the centre.
  let distance: number | null = null;
  let verified = false;
  if (center?.lat != null && center?.lng != null && parsed.data.lat != null && parsed.data.lng != null) {
    distance = haversineMeters(parsed.data.lat, parsed.data.lng, center.lat, center.lng);
    verified = distance <= (center.radius_m ?? 300);
  }

  const { error } = await supabase.from("volunteer_checkins").insert({
    volunteer_id: profile.id,
    center_id: parsed.data.centerId,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    distance_m: distance,
    location_verified: verified,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/checkin");
  return { ok: true as const, distance, verified };
}

export async function checkOut() {
  const { profile, supabase } = await requireProfile();

  const { data: open } = await supabase
    .from("volunteer_checkins")
    .select("id, check_in_at")
    .eq("volunteer_id", profile.id)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!open) return { ok: false as const, error: "You are not checked in anywhere." };

  const { error } = await supabase
    .from("volunteer_checkins")
    .update({ check_out_at: new Date().toISOString() })
    .eq("id", open.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/checkin");
  revalidatePath("/certificates");
  return { ok: true as const };
}
