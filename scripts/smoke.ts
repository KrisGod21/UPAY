/**
 * Renders every page as a real signed-in user and asserts the page actually
 * contains its data.
 *
 * A status-code check is not enough. Two pages once returned 200 with a
 * perfectly valid empty shell — an ambiguous PostgREST embed had failed and the
 * page rendered "No zones yet" against a database holding six of them. Every
 * check below therefore asserts on rendered text.
 *
 * Usage: npm run smoke [baseUrl]
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true } as never);

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PW = process.env.DEMO_PASSWORD ?? "upay@2026";
const ref = new global.URL(URL_).hostname.split(".")[0];

interface Check {
  path: string;
  /** Text that must appear for the page to be considered rendered. */
  expect: (string | RegExp)[];
  /** Text that must NOT appear — usually an empty-state message. */
  reject?: (string | RegExp)[];
}

const AS_ADMIN: Check[] = [
  { path: "/dashboard", expect: [/Children enrolled/, /\d+%/, /Attendance trend/], reject: [/Nothing is flagged/] },
  { path: "/analytics", expect: [/Children tracked/, /Volunteer hours/, /Attendance by zone/] },
  { path: "/centers", expect: [/Sitabuldi Signal/, /Nagpur/], reject: [/No centres yet/] },
  { path: "/students", expect: [/UPY-/, /Foundation|Level/], reject: [/No children match/] },
  { path: "/volunteers", expect: [/Volunteers & teachers|Volunteers &amp; teachers/, /\d+%/], reject: [/No volunteers yet/] },
  { path: "/zones", expect: [/Nagpur Central/, /Coordinated by/], reject: [/No zones yet/] },
  { path: "/curriculum", expect: [/Lesson units/, /Numeracy|Literacy/], reject: [/Nothing scheduled yet/] },
  { path: "/assessments", expect: [/Papers/, /Sheets marked/] },
  { path: "/certificates", expect: [/Certificates issued/, /Hours recognised/] },
  { path: "/attendance", expect: [/Sitabuldi|Kalamna|Okhla/, /by face|By hand|faces/], reject: [/No sessions recorded/] },
  { path: "/team", expect: [/Administrator/, /Meera|Sandeep/], reject: [/>0<\/p>\s*<p[^>]*>Administrators/] },
  { path: "/upaygpt", expect: [/Ask about the programme/] },
  { path: "/import", expect: [/Choose the spreadsheet/] },
];

const AS_VOLUNTEER: Check[] = [
  { path: "/dashboard", expect: [/Children enrolled/] },
  { path: "/attendance/new", expect: [/Take attendance|class photograph/i] },
  { path: "/checkin", expect: [/Start a shift|Checked in/] },
];

function cookieFor(session: unknown): string {
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
  const name = `sb-${ref}-auth-token`;
  const MAX = 3180;
  if (value.length <= MAX) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += MAX) parts.push(value.slice(i, i + MAX));
  return parts.map((p, i) => `${name}.${i}=${p}`).join("; ");
}

async function run(email: string, checks: Check[]): Promise<number> {
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PW });
  if (error || !data.session) {
    console.log(`  ${email}: SIGN-IN FAILED — ${error?.message}`);
    return checks.length;
  }
  const cookie = cookieFor(data.session);

  let failures = 0;
  console.log(`\n  as ${email}`);
  for (const check of checks) {
    const started = Date.now();
    const res = await fetch(BASE + check.path, { headers: { cookie } });
    const html = await res.text();
    const ms = Date.now() - started;

    const missing = check.expect.filter((e) =>
      typeof e === "string" ? !html.includes(e) : !e.test(html),
    );
    const present = (check.reject ?? []).filter((r) =>
      typeof r === "string" ? html.includes(r) : r.test(html),
    );

    const ok = res.status === 200 && !missing.length && !present.length;
    if (!ok) failures++;
    console.log(
      `    ${ok ? "PASS" : "FAIL"}  ${check.path.padEnd(18)} ${String(ms + "ms").padStart(7)}` +
        (ok ? "" : `  status=${res.status} missing=[${missing.join(", ")}] unexpected=[${present.join(", ")}]`),
    );
  }
  return failures;
}

async function main() {
  console.log(`Smoke test against ${BASE}`);
  const failures = (await run("admin@upay.org", AS_ADMIN)) + (await run("volunteer@upay.org", AS_VOLUNTEER));
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main();
