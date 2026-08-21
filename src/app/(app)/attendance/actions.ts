"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { haversineMeters } from "@/lib/utils";

const markSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["present", "absent", "late"]),
  method: z.enum(["face", "manual"]),
  confidence: z.number().min(0).max(1).nullable(),
  overridden: z.boolean(),
});

const sessionSchema = z.object({
  centerId: z.string().uuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subject: z.string().max(80).nullable(),
  curriculumUnitId: z.string().uuid().nullable().optional(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  facesDetected: z.number().int().min(0),
  autoMatched: z.number().int().min(0),
  notes: z.string().max(500).nullable().optional(),
  marks: z.array(markSchema).min(1),
});

export type SaveAttendanceInput = z.infer<typeof sessionSchema>;

export async function saveAttendance(input: SaveAttendanceInput) {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }
  const data = parsed.data;
  const { profile, supabase } = await requireProfile();

  const { data: session, error: sessionError } = await supabase
    .from("class_sessions")
    .insert({
      center_id: data.centerId,
      conducted_by: profile.id,
      session_date: data.sessionDate,
      subject: data.subject,
      curriculum_unit_id: data.curriculumUnitId ?? null,
      lat: data.lat,
      lng: data.lng,
      faces_detected: data.facesDetected,
      auto_matched: data.autoMatched,
      notes: data.notes ?? null,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { ok: false as const, error: sessionError?.message ?? "Could not create the session." };
  }

  const { error: attendanceError } = await supabase.from("attendance").insert(
    data.marks.map((m) => ({
      session_id: session.id,
      student_id: m.studentId,
      status: m.status,
      method: m.method,
      confidence: m.confidence,
      overridden: m.overridden,
      marked_by: profile.id,
    })),
  );

  if (attendanceError) {
    // Don't leave a session with no register attached to it.
    await supabase.from("class_sessions").delete().eq("id", session.id);
    return { ok: false as const, error: attendanceError.message };
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true as const, sessionId: session.id as string };
}

const enrollSchema = z.object({
  studentId: z.string().uuid(),
  descriptor: z.array(z.number()).length(128),
});

/** Stores a face embedding for one child. The photograph is never sent here. */
export async function enrollFace(studentId: string, descriptor: number[]) {
  const parsed = enrollSchema.safeParse({ studentId, descriptor });
  if (!parsed.success) return { ok: false as const, error: "That descriptor is not valid." };

  const { supabase } = await requireProfile();
  const { error } = await supabase
    .from("students")
    .update({ face_descriptor: parsed.data.descriptor })
    .eq("id", parsed.data.studentId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/students");
  return { ok: true as const };
}

export async function enrollMany(entries: { studentId: string; descriptor: number[] }[]) {
  const { supabase } = await requireProfile();
  const results = await Promise.all(
    entries.map(async (e) => {
      const parsed = enrollSchema.safeParse(e);
      if (!parsed.success) return false;
      const { error } = await supabase
        .from("students")
        .update({ face_descriptor: parsed.data.descriptor })
        .eq("id", parsed.data.studentId);
      return !error;
    }),
  );
  revalidatePath("/students");
  return { ok: true as const, enrolled: results.filter(Boolean).length };
}

/** Distance from a centre, used to show whether a capture happened on site. */
export async function verifyLocation(centerId: string, lat: number, lng: number) {
  const { supabase } = await requireProfile();
  const { data: center } = await supabase
    .from("centers")
    .select("lat, lng, radius_m")
    .eq("id", centerId)
    .single();

  if (!center?.lat || !center?.lng) {
    return { known: false as const };
  }
  const distance = haversineMeters(lat, lng, center.lat, center.lng);
  return { known: true as const, distance, within: distance <= (center.radius_m ?? 300) };
}
