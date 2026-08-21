import { describe, it, expect } from "vitest";
import { assessEligibility, certificateSerial, CERT_LABELS } from "@/lib/certificates";

const asOf = new Date("2026-08-21T00:00:00Z");
const longAgo = "2025-01-01";
const lastWeek = "2026-08-14";

const base = {
  totalHours: 0,
  shifts: 0,
  verifiedShifts: 0,
  sessionsLed: 0,
  joinedOn: longAgo,
  asOf,
};

describe("assessEligibility", () => {
  it("awards the 250-hour certificate above that threshold", () => {
    const r = assessEligibility({ ...base, totalHours: 260, shifts: 100, verifiedShifts: 50 });
    expect(r.type).toBe("service_250");
    expect(r.eligible).toBe(true);
  });

  it("awards excellence for verified, class-leading service", () => {
    const r = assessEligibility({
      ...base,
      totalHours: 140,
      shifts: 50,
      verifiedShifts: 48,
      sessionsLed: 30,
    });
    expect(r.type).toBe("excellence");
  });

  it("withholds excellence when most shifts were logged off site", () => {
    const r = assessEligibility({
      ...base,
      totalHours: 140,
      shifts: 50,
      verifiedShifts: 20,
      sessionsLed: 30,
    });
    expect(r.type).toBe("service_100");
  });

  it("withholds excellence from someone who never led a class", () => {
    const r = assessEligibility({
      ...base,
      totalHours: 140,
      shifts: 50,
      verifiedShifts: 50,
      sessionsLed: 2,
    });
    expect(r.type).toBe("service_100");
  });

  it("awards participation once hours and tenure are both met", () => {
    const r = assessEligibility({ ...base, totalHours: 25, shifts: 12, verifiedShifts: 10 });
    expect(r.type).toBe("participation");
  });

  it("withholds participation from a brand-new volunteer with many hours", () => {
    const r = assessEligibility({
      ...base,
      totalHours: 40,
      shifts: 15,
      verifiedShifts: 15,
      joinedOn: lastWeek,
    });
    expect(r.eligible).toBe(false);
    expect(r.shortfall).toMatch(/more day/);
  });

  it("names the hours still needed", () => {
    const r = assessEligibility({ ...base, totalHours: 6, shifts: 3, verifiedShifts: 3 });
    expect(r.eligible).toBe(false);
    expect(r.shortfall).toMatch(/14 more hours/);
  });

  it("does not divide by zero for a volunteer with no shifts", () => {
    const r = assessEligibility({ ...base });
    expect(r.verifiedShare).toBe(0);
    expect(r.eligible).toBe(false);
  });

  it("treats a missing join date as zero tenure rather than crashing", () => {
    const r = assessEligibility({ ...base, totalHours: 30, joinedOn: null });
    expect(r.tenureDays).toBe(0);
    expect(r.eligible).toBe(false);
  });

  it("ignores negative hours from bad data", () => {
    const r = assessEligibility({ ...base, totalHours: -50 });
    expect(r.eligible).toBe(false);
  });

  it("computes tenure in whole days", () => {
    const r = assessEligibility({ ...base, joinedOn: "2026-07-22" });
    expect(r.tenureDays).toBe(30);
  });

  it("gives every certificate type a human label", () => {
    for (const label of Object.values(CERT_LABELS)) expect(label.length).toBeGreaterThan(3);
  });
});

describe("certificateSerial", () => {
  it("zero-pads the sequence", () => {
    expect(certificateSerial(7, 2026)).toBe("UPAY-CERT-2026-0007");
  });
  it("keeps four digits for larger sequences", () => {
    expect(certificateSerial(1234, 2026)).toBe("UPAY-CERT-2026-1234");
  });
});
