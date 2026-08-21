"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";

const rowSchema = z.object({
  full_name: z.string().min(1),
  center: z.string().min(1),
  student_code: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  guardian_name: z.string().nullable().optional(),
  guardian_phone: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
});

export interface ImportOutcome {
  ok: boolean;
  inserted: number;
  skipped: number;
  unknownCentres: string[];
  error?: string;
}

/**
 * Imports mapped student rows. Centres are matched by name or code and never
 * created implicitly — a typo in a spreadsheet should not silently spawn a
 * centre that nobody runs.
 */
export async function importStudents(
  rows: z.infer<typeof rowSchema>[],
): Promise<ImportOutcome> {
  const parsed = z.array(rowSchema).max(2000).safeParse(rows);
  if (!parsed.success) {
    return { ok: false, inserted: 0, skipped: 0, unknownCentres: [], error: "Those rows are not valid." };
  }

  const { supabase } = await requireRole(["admin"]);

  const { data: centres } = await supabase.from("centers").select("id, name, code");
  const byName = new Map<string, string>();
  for (const c of centres ?? []) {
    byName.set(String(c.name).trim().toLowerCase(), c.id as string);
    byName.set(String(c.code).trim().toLowerCase(), c.id as string);
  }

  const { count } = await supabase.from("students").select("id", { count: "exact", head: true });
  let sequence = (count ?? 0) + 1;

  const unknown = new Set<string>();
  const payload: Record<string, unknown>[] = [];

  for (const row of parsed.data) {
    const centerId = byName.get(row.center.trim().toLowerCase());
    if (!centerId) {
      unknown.add(row.center.trim());
      continue;
    }
    payload.push({
      center_id: centerId,
      full_name: row.full_name.trim(),
      student_code: row.student_code?.trim() || `UPY-I${String(sequence++).padStart(4, "0")}`,
      dob: row.dob || null,
      gender: row.gender || null,
      guardian_name: row.guardian_name || null,
      guardian_phone: row.guardian_phone || null,
      level: row.level || "foundation",
      active: true,
    });
  }

  if (!payload.length) {
    return {
      ok: false,
      inserted: 0,
      skipped: parsed.data.length,
      unknownCentres: [...unknown],
      error: unknown.size
        ? "None of the centre names in this file match a centre in the system."
        : "There was nothing to import.",
    };
  }

  // ignoreDuplicates so re-running an import does not error on student_code.
  const { data, error } = await supabase
    .from("students")
    .upsert(payload, { onConflict: "student_code", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return { ok: false, inserted: 0, skipped: 0, unknownCentres: [...unknown], error: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");

  return {
    ok: true,
    inserted: data?.length ?? 0,
    skipped: parsed.data.length - payload.length,
    unknownCentres: [...unknown],
  };
}
