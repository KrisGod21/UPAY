import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Great-circle distance in metres between two WGS-84 points. */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(s))));
}

/**
 * Euclidean distance between two face descriptors. face-api treats anything
 * below ~0.5 as the same person; above ~0.6 is confidently a different one.
 */
export function descriptorDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export const FACE_MATCH_THRESHOLD = 0.5;

/** Best roster match for one detected face, or null if nothing is close enough. */
export function bestMatch<T extends { id: string; face_descriptor: number[] | null }>(
  probe: number[],
  roster: T[],
  threshold = FACE_MATCH_THRESHOLD,
): { entry: T; distance: number; confidence: number } | null {
  let best: { entry: T; distance: number } | null = null;
  for (const entry of roster) {
    if (!entry.face_descriptor || entry.face_descriptor.length !== probe.length) continue;
    const distance = descriptorDistance(probe, entry.face_descriptor);
    if (!best || distance < best.distance) best = { entry, distance };
  }
  if (!best || best.distance > threshold) return null;
  // Map a 0..threshold distance onto a 100..0 confidence reading.
  const confidence = Math.round((1 - best.distance / threshold) * 100);
  return { ...best, confidence: Math.max(1, Math.min(100, confidence)) };
}

export const LEVEL_LABELS: Record<string, string> = {
  foundation: "Foundation",
  level_1: "Level 1",
  level_2: "Level 2",
  level_3: "Level 3",
  bridge: "Bridge to School",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  coordinator: "Zone Coordinator",
  teacher: "Teacher",
  volunteer: "Volunteer",
  student: "Student",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}
