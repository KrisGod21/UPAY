import type { CertificateType } from "@/lib/types";

export interface EligibilityInput {
  totalHours: number;
  shifts: number;
  verifiedShifts: number;
  sessionsLed: number;
  joinedOn: string | null;
  /** Evaluated against this date so the rule is testable rather than clock-dependent. */
  asOf?: Date;
}

export interface Eligibility {
  eligible: boolean;
  type: CertificateType | null;
  label: string;
  /** What the volunteer still needs, when they are not yet eligible. */
  shortfall: string | null;
  tenureDays: number;
  verifiedShare: number;
}

const THRESHOLDS = {
  participation: 20,
  service_100: 100,
  service_250: 250,
} as const;

const MIN_TENURE_DAYS = 60;

export const CERT_LABELS: Record<CertificateType, string> = {
  participation: "Certificate of Participation",
  service_100: "100 Hours of Service",
  service_250: "250 Hours of Service",
  excellence: "Award for Outstanding Service",
};

/**
 * Decides which certificate, if any, a volunteer has earned.
 *
 * Hours alone are not enough: a volunteer who logged everything from outside
 * the centre has not demonstrated service, so the excellence award additionally
 * requires that most shifts were geo-verified.
 */
export function assessEligibility(input: EligibilityInput): Eligibility {
  const asOf = input.asOf ?? new Date();
  const hours = Math.max(0, input.totalHours);
  const tenureDays = input.joinedOn
    ? Math.max(0, Math.floor((asOf.getTime() - new Date(input.joinedOn).getTime()) / 86_400_000))
    : 0;
  const verifiedShare = input.shifts > 0 ? input.verifiedShifts / input.shifts : 0;

  const base = { tenureDays, verifiedShare };

  if (hours >= THRESHOLDS.service_250) {
    return { ...base, eligible: true, type: "service_250", label: CERT_LABELS.service_250, shortfall: null };
  }

  // Outstanding service sits between the hour milestones: real hours, genuinely
  // on site, and actually leading classes rather than only attending them.
  if (hours >= THRESHOLDS.service_100 && verifiedShare >= 0.9 && input.sessionsLed >= 20) {
    return { ...base, eligible: true, type: "excellence", label: CERT_LABELS.excellence, shortfall: null };
  }

  if (hours >= THRESHOLDS.service_100) {
    return { ...base, eligible: true, type: "service_100", label: CERT_LABELS.service_100, shortfall: null };
  }

  if (hours >= THRESHOLDS.participation && tenureDays >= MIN_TENURE_DAYS) {
    return {
      ...base,
      eligible: true,
      type: "participation",
      label: CERT_LABELS.participation,
      shortfall: null,
    };
  }

  const needsHours = Math.max(0, THRESHOLDS.participation - hours);
  const needsDays = Math.max(0, MIN_TENURE_DAYS - tenureDays);
  const parts: string[] = [];
  if (needsHours > 0) parts.push(`${Math.ceil(needsHours)} more hour${needsHours >= 2 ? "s" : ""}`);
  if (needsDays > 0) parts.push(`${needsDays} more day${needsDays === 1 ? "" : "s"} with the programme`);

  return {
    ...base,
    eligible: false,
    type: null,
    label: "Not yet eligible",
    shortfall: parts.length ? parts.join(" and ") : "a completed shift",
  };
}

/** Stable, human-readable serial. Year plus a zero-padded sequence. */
export function certificateSerial(sequence: number, year = new Date().getFullYear()): string {
  return `UPAY-CERT-${year}-${String(sequence).padStart(4, "0")}`;
}
