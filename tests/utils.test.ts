import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  descriptorDistance,
  bestMatch,
  pct,
  stripOptionPrefix,
} from "@/lib/utils";

describe("haversineMeters", () => {
  it("returns zero for the same point", () => {
    expect(haversineMeters(21.1458, 79.0882, 21.1458, 79.0882)).toBe(0);
  });

  it("matches a known distance", () => {
    // Nagpur railway station to Zero Mile, ~1.6 km apart.
    const d = haversineMeters(21.1533, 79.0947, 21.1498, 79.0806);
    expect(d).toBeGreaterThan(1_300);
    expect(d).toBeLessThan(1_800);
  });

  it("is symmetric", () => {
    const a = haversineMeters(28.61, 77.2, 19.07, 72.87);
    const b = haversineMeters(19.07, 72.87, 28.61, 77.2);
    expect(a).toBe(b);
  });

  it("puts a point 200 m away inside a 300 m geofence", () => {
    // ~0.0018 degrees of latitude is roughly 200 m.
    const d = haversineMeters(21.1458, 79.0882, 21.1458 + 0.0018, 79.0882);
    expect(d).toBeLessThan(300);
    expect(d).toBeGreaterThan(150);
  });
});

describe("descriptorDistance", () => {
  it("is zero for identical descriptors", () => {
    const v = Array.from({ length: 128 }, (_, i) => i / 128);
    expect(descriptorDistance(v, v)).toBe(0);
  });

  it("rejects mismatched lengths rather than silently comparing", () => {
    expect(() => descriptorDistance([1, 2, 3], [1, 2])).toThrow(/length mismatch/i);
  });

  it("grows as descriptors diverge", () => {
    const a = new Array(128).fill(0);
    const near = new Array(128).fill(0.01);
    const far = new Array(128).fill(0.5);
    expect(descriptorDistance(a, near)).toBeLessThan(descriptorDistance(a, far));
  });
});

describe("bestMatch", () => {
  const roster = [
    { id: "asha", face_descriptor: new Array(128).fill(0) },
    { id: "ravi", face_descriptor: new Array(128).fill(1) },
  ];

  it("picks the nearest student", () => {
    const probe = new Array(128).fill(0.001);
    const match = bestMatch(probe, roster);
    expect(match?.entry.id).toBe("asha");
  });

  it("returns null when nothing is within the threshold", () => {
    const probe = new Array(128).fill(0.5);
    expect(bestMatch(probe, roster)).toBeNull();
  });

  it("skips students who have not been enrolled", () => {
    const partial = [
      { id: "unenrolled", face_descriptor: null },
      { id: "asha", face_descriptor: new Array(128).fill(0) },
    ];
    const match = bestMatch(new Array(128).fill(0.001), partial);
    expect(match?.entry.id).toBe("asha");
  });

  it("reports higher confidence for a closer face", () => {
    const close = bestMatch(new Array(128).fill(0.0001), roster);
    const loose = bestMatch(new Array(128).fill(0.04), roster);
    expect(close!.confidence).toBeGreaterThan(loose!.confidence);
    expect(close!.confidence).toBeLessThanOrEqual(100);
    expect(loose!.confidence).toBeGreaterThanOrEqual(1);
  });
});

describe("pct", () => {
  it("guards against dividing by zero", () => {
    expect(pct(0, 0)).toBe(0);
  });

  it("rounds to a whole percent", () => {
    expect(pct(1, 3)).toBe(33);
  });
});

describe("stripOptionPrefix", () => {
  it("removes a letter with a full stop", () =>
    expect(stripOptionPrefix("A. 12 rupees")).toBe("12 rupees"));
  it("removes a letter with a bracket", () =>
    expect(stripOptionPrefix("B) 16 rupees")).toBe("16 rupees"));
  it("leaves an option that has no prefix alone", () =>
    expect(stripOptionPrefix("12 rupees")).toBe("12 rupees"));
  it("does not eat a real answer that starts with a letter", () =>
    expect(stripOptionPrefix("Apple")).toBe("Apple"));
  it("does not strip beyond A-D", () =>
    expect(stripOptionPrefix("E. none")).toBe("E. none"));
});
