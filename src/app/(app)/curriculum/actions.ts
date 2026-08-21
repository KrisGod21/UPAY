"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";

const LEVELS = ["foundation", "level_1", "level_2", "level_3", "bridge"] as const;

const unitSchema = z.object({
  title: z.string().min(3).max(120),
  subject: z.string().min(2).max(60),
  level: z.enum(LEVELS),
  description: z.string().max(400).optional(),
  content_md: z.string().max(8000).optional(),
  duration_min: z.number().int().min(10).max(180),
});

export async function createUnit(input: z.infer<typeof unitSchema>) {
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid unit." };
  }

  const { profile, supabase } = await requireProfile();
  const { error } = await supabase.from("curriculum_units").insert({
    ...parsed.data,
    created_by: profile.id,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/curriculum");
  return { ok: true as const };
}

const scheduleSchema = z.object({
  unitId: z.string().uuid(),
  centerIds: z.array(z.string().uuid()).min(1),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function scheduleUnit(input: z.infer<typeof scheduleSchema>) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Pick at least one centre and a date." };

  const { supabase } = await requireProfile();
  const { error } = await supabase.from("center_curriculum").upsert(
    parsed.data.centerIds.map((center_id) => ({
      center_id,
      unit_id: parsed.data.unitId,
      scheduled_for: parsed.data.scheduledFor,
      status: "scheduled" as const,
    })),
    { onConflict: "center_id,unit_id,scheduled_for", ignoreDuplicates: true },
  );

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/curriculum");
  revalidatePath("/dashboard");
  return { ok: true as const, scheduled: parsed.data.centerIds.length };
}

export async function markDelivered(scheduleId: string, delivered: boolean) {
  const { profile, supabase } = await requireProfile();
  const { error } = await supabase
    .from("center_curriculum")
    .update({
      status: delivered ? "delivered" : "scheduled",
      delivered_on: delivered ? new Date().toISOString().slice(0, 10) : null,
      delivered_by: delivered ? profile.id : null,
    })
    .eq("id", scheduleId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/curriculum");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
