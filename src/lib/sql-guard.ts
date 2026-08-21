/**
 * Application-side guard for model-generated SQL.
 *
 * The database function upaygpt_query() enforces the same rules and is the real
 * boundary — this runs first so a bad query is rejected with a readable message
 * before it ever reaches Postgres. Two layers, because the model writing the
 * query is not trustworthy and only one of these can be the last line.
 */

const FORBIDDEN_KEYWORDS = [
  "insert", "update", "delete", "drop", "alter", "create", "truncate",
  "grant", "revoke", "copy", "vacuum", "call", "merge", "comment",
  "reindex", "refresh", "listen", "notify", "execute", "prepare", "set",
];

const FORBIDDEN_OBJECTS = [
  "pg_catalog", "pg_sleep", "pg_read", "pg_ls", "pg_stat_file",
  "information_schema", "auth.", "storage.", "vault.", "dblink",
  "lo_import", "lo_export",
];

/** Tables and views UpayGPT is allowed to read. */
export const ALLOWED_RELATIONS = [
  "zones", "centers", "students", "profiles", "class_sessions", "attendance",
  "volunteer_checkins", "curriculum_units", "center_curriculum", "assessments",
  "assessment_results", "certificates", "badges",
  "v_attendance_daily", "v_center_stats", "v_student_progress", "v_volunteer_stats",
] as const;

export interface GuardResult {
  ok: boolean;
  sql?: string;
  reason?: string;
}

/** Strips SQL comments so a denied keyword cannot hide behind `--` or a block. */
function stripComments(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

function stripStringLiterals(input: string): string {
  return input.replace(/'(?:[^']|'')*'/g, "''");
}

export function guardSql(raw: string): GuardResult {
  if (!raw || !raw.trim()) return { ok: false, reason: "The model returned an empty query." };

  // Models like to wrap SQL in a markdown fence; unwrap it before judging.
  let sql = raw.trim().replace(/^```(?:sql)?\s*/i, "").replace(/```$/i, "").trim();
  sql = sql.replace(/;\s*$/, "").trim();

  const bare = stripStringLiterals(stripComments(sql)).toLowerCase();

  if (bare.includes(";")) {
    return { ok: false, reason: "Only a single statement is allowed." };
  }

  if (!/^\s*(select|with)\s/.test(bare)) {
    return { ok: false, reason: "Only SELECT queries are allowed." };
  }

  for (const kw of FORBIDDEN_KEYWORDS) {
    // \b would match inside identifiers like "updated_at"; require a boundary
    // that is not an underscore on either side.
    const re = new RegExp(`(^|[^a-z0-9_])${kw}([^a-z0-9_]|$)`, "i");
    if (re.test(bare)) {
      return { ok: false, reason: `The query contains a forbidden keyword: ${kw}.` };
    }
  }

  for (const obj of FORBIDDEN_OBJECTS) {
    if (bare.includes(obj)) {
      return { ok: false, reason: `The query references a restricted object: ${obj}.` };
    }
  }

  return { ok: true, sql };
}

/** Wraps a vetted query so it can never return an unbounded result set. */
export function withRowLimit(sql: string, limit = 500): string {
  return `select * from (${sql}) as upaygpt_result limit ${limit}`;
}
