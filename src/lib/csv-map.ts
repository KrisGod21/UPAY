/**
 * Column mapping for legacy spreadsheet imports.
 *
 * UPAY's existing records were kept by many people over many years, so the
 * headers are inconsistent — "Name", "Student Name", "नाम", "child". The guesser
 * gets it right often enough to save the work, and the operator confirms every
 * column before anything is written.
 */

export interface FieldSpec {
  key: string;
  label: string;
  required?: boolean;
  /** Lowercase header fragments that suggest this field. */
  aliases: string[];
}

export const STUDENT_FIELDS: FieldSpec[] = [
  { key: "full_name", label: "Full name", required: true, aliases: ["name", "student", "child", "naam"] },
  { key: "student_code", label: "Student code", aliases: ["code", "id", "roll", "reg"] },
  { key: "dob", label: "Date of birth", aliases: ["dob", "birth", "born", "janm"] },
  { key: "gender", label: "Gender", aliases: ["gender", "sex", "m/f"] },
  { key: "guardian_name", label: "Guardian name", aliases: ["guardian", "parent", "father", "mother", "care"] },
  { key: "guardian_phone", label: "Guardian phone", aliases: ["phone", "mobile", "contact", "number"] },
  { key: "level", label: "Learning level", aliases: ["level", "grade", "class", "standard"] },
  { key: "center", label: "Centre", required: true, aliases: ["centre", "center", "location", "site"] },
];

const LEVEL_ALIASES: Record<string, string> = {
  foundation: "foundation",
  "0": "foundation",
  "1": "level_1",
  "2": "level_2",
  "3": "level_3",
  level1: "level_1",
  level2: "level_2",
  level3: "level_3",
  level_1: "level_1",
  level_2: "level_2",
  level_3: "level_3",
  bridge: "bridge",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Best-guess header for each field. Never guesses the same header twice. */
export function guessMapping(headers: string[], fields: FieldSpec[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const taken = new Set<string>();

  for (const field of fields) {
    // An exact match on the field key or label wins outright.
    const exact = headers.find(
      (h) => !taken.has(h) && (norm(h) === norm(field.key) || norm(h) === norm(field.label)),
    );
    if (exact) {
      mapping[field.key] = exact;
      taken.add(exact);
      continue;
    }

    const fuzzy = headers.find(
      (h) => !taken.has(h) && field.aliases.some((a) => norm(h).includes(norm(a))),
    );
    if (fuzzy) {
      mapping[field.key] = fuzzy;
      taken.add(fuzzy);
    }
  }

  return mapping;
}

/** Accepts dd/mm/yyyy and dd-mm-yyyy alongside ISO, and rejects nonsense. */
export function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return isRealDate(+iso[1], +iso[2], +iso[3]) ? trimmed : null;

  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return isRealDate(+y, +m, +d)
      ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
      : null;
  }

  return null;
}

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function normaliseLevel(value: string): string {
  const key = norm(value);
  return LEVEL_ALIASES[key] ?? LEVEL_ALIASES[value.trim().toLowerCase()] ?? "foundation";
}

export function normalisePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  return `+91 ${last10}`;
}

export function normaliseGender(value: string): string | null {
  const v = norm(value);
  if (!v) return null;
  if (v.startsWith("f") || v === "girl" || v === "female") return "F";
  if (v.startsWith("m") || v === "boy" || v === "male") return "M";
  return null;
}

export interface MappedRow {
  row: number;
  values: Record<string, string | null>;
  errors: string[];
}

export interface MapResult {
  rows: MappedRow[];
  valid: MappedRow[];
  invalid: MappedRow[];
}

export function applyMapping(
  records: Record<string, string>[],
  mapping: Record<string, string>,
  fields: FieldSpec[],
): MapResult {
  const rows: MappedRow[] = records.map((record, i) => {
    const values: Record<string, string | null> = {};
    const errors: string[] = [];

    for (const field of fields) {
      const header = mapping[field.key];
      const raw = header ? (record[header] ?? "").trim() : "";

      if (field.required && !raw) {
        errors.push(`${field.label} is missing`);
        values[field.key] = null;
        continue;
      }

      if (!raw) {
        values[field.key] = null;
        continue;
      }

      switch (field.key) {
        case "dob": {
          const parsed = parseDate(raw);
          if (!parsed) errors.push(`Date of birth "${raw}" could not be read`);
          values.dob = parsed;
          break;
        }
        case "level":
          values.level = normaliseLevel(raw);
          break;
        case "guardian_phone":
          values.guardian_phone = normalisePhone(raw);
          break;
        case "gender":
          values.gender = normaliseGender(raw);
          break;
        default:
          values[field.key] = raw;
      }
    }

    return { row: i + 2, values, errors }; // +2: header row plus 1-indexing
  });

  return {
    rows,
    valid: rows.filter((r) => !r.errors.length),
    invalid: rows.filter((r) => r.errors.length),
  };
}
