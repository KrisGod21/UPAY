import { describe, it, expect } from "vitest";
import {
  guessMapping,
  applyMapping,
  parseDate,
  normaliseLevel,
  normalisePhone,
  normaliseGender,
  STUDENT_FIELDS,
} from "@/lib/csv-map";

describe("guessMapping", () => {
  it("matches obvious headers", () => {
    const m = guessMapping(["Name", "Centre", "DOB", "Mobile"], STUDENT_FIELDS);
    expect(m.full_name).toBe("Name");
    expect(m.center).toBe("Centre");
    expect(m.dob).toBe("DOB");
    expect(m.guardian_phone).toBe("Mobile");
  });

  it("matches messy real-world headers", () => {
    const m = guessMapping(
      ["Student Name ", "Father's Name", "Contact Number", "Center Location", "Class/Grade"],
      STUDENT_FIELDS,
    );
    expect(m.full_name).toBe("Student Name ");
    expect(m.guardian_name).toBe("Father's Name");
    expect(m.guardian_phone).toBe("Contact Number");
    expect(m.center).toBe("Center Location");
    expect(m.level).toBe("Class/Grade");
  });

  it("never assigns one header to two fields", () => {
    const m = guessMapping(["Name"], STUDENT_FIELDS);
    const used = Object.values(m);
    expect(new Set(used).size).toBe(used.length);
  });

  it("leaves a field unmapped rather than guessing wildly", () => {
    const m = guessMapping(["Colour", "Shape"], STUDENT_FIELDS);
    expect(m.full_name).toBeUndefined();
  });
});

describe("parseDate", () => {
  it("accepts ISO", () => expect(parseDate("2015-04-09")).toBe("2015-04-09"));
  it("accepts dd/mm/yyyy, the Indian convention", () =>
    expect(parseDate("09/04/2015")).toBe("2015-04-09"));
  it("accepts dd-mm-yyyy", () => expect(parseDate("9-4-2015")).toBe("2015-04-09"));
  it("rejects an impossible day", () => expect(parseDate("32/01/2015")).toBeNull());
  it("rejects 31 February", () => expect(parseDate("31/02/2015")).toBeNull());
  it("rejects free text", () => expect(parseDate("last year")).toBeNull());
  it("returns null for blank", () => expect(parseDate("   ")).toBeNull());
});

describe("normalisePhone", () => {
  it("keeps the last ten digits", () => expect(normalisePhone("+91-98765 43210")).toBe("+91 9876543210"));
  it("handles a bare ten-digit number", () => expect(normalisePhone("9876543210")).toBe("+91 9876543210"));
  it("rejects a number that is too short", () => expect(normalisePhone("12345")).toBeNull());
});

describe("normaliseGender", () => {
  it("reads female forms", () => {
    for (const v of ["F", "female", "Girl"]) expect(normaliseGender(v)).toBe("F");
  });
  it("reads male forms", () => {
    for (const v of ["M", "male", "Boy"]) expect(normaliseGender(v)).toBe("M");
  });
  it("returns null for anything else rather than guessing", () => {
    expect(normaliseGender("other")).toBeNull();
    expect(normaliseGender("")).toBeNull();
  });
});

describe("normaliseLevel", () => {
  it("maps numeric grades", () => expect(normaliseLevel("2")).toBe("level_2"));
  it("maps written levels", () => expect(normaliseLevel("Level 3")).toBe("level_3"));
  it("maps bridge", () => expect(normaliseLevel("Bridge")).toBe("bridge"));
  it("falls back to foundation for the unrecognised", () =>
    expect(normaliseLevel("beginner")).toBe("foundation"));
});

describe("applyMapping", () => {
  const mapping = {
    full_name: "Name",
    center: "Centre",
    dob: "DOB",
    guardian_phone: "Mobile",
    level: "Class",
    gender: "Sex",
  };

  it("converts a clean row", () => {
    const result = applyMapping(
      [{ Name: "Asha Verma", Centre: "Sitabuldi Signal", DOB: "09/04/2015", Mobile: "9876543210", Class: "2", Sex: "F" }],
      mapping,
      STUDENT_FIELDS,
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].values).toMatchObject({
      full_name: "Asha Verma",
      center: "Sitabuldi Signal",
      dob: "2015-04-09",
      guardian_phone: "+91 9876543210",
      level: "level_2",
      gender: "F",
    });
  });

  it("flags a row missing a required field, without discarding the others", () => {
    const result = applyMapping(
      [
        { Name: "", Centre: "Okhla Signal" },
        { Name: "Ravi Kumar", Centre: "Okhla Signal" },
      ],
      mapping,
      STUDENT_FIELDS,
    );
    expect(result.invalid).toHaveLength(1);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid[0].errors[0]).toMatch(/Full name is missing/);
  });

  it("reports the spreadsheet row number, accounting for the header", () => {
    const result = applyMapping(
      [{ Name: "A", Centre: "X" }, { Name: "", Centre: "X" }],
      mapping,
      STUDENT_FIELDS,
    );
    expect(result.invalid[0].row).toBe(3);
  });

  it("flags an unreadable date rather than importing a wrong one", () => {
    const result = applyMapping(
      [{ Name: "Asha", Centre: "X", DOB: "sometime in 2015" }],
      mapping,
      STUDENT_FIELDS,
    );
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors[0]).toMatch(/could not be read/);
  });

  it("leaves optional unmapped fields null instead of failing", () => {
    const result = applyMapping(
      [{ Name: "Asha", Centre: "X" }],
      { full_name: "Name", center: "Centre" },
      STUDENT_FIELDS,
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].values.guardian_name).toBeNull();
  });
});
