/**
 * Seeds a realistic Footpathshala dataset.
 *
 * The point is not volume, it is signal. The generated attendance contains a
 * centre in measurable decline, a cohort of children falling behind, and
 * volunteers whose contribution stands out — so the analytics pages and
 * UpayGPT have something true to find rather than uniform noise.
 *
 * Run with: npm run db:seed   (after npm run db:push)
 */
import postgres from "postgres";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "upay@2026";

for (const [name, value] of Object.entries({ DATABASE_URL, SUPABASE_URL, SERVICE_KEY })) {
  if (!value) {
    console.error(`${name} is not set. Copy .env.example to .env.local and fill it in.`);
    process.exit(1);
  }
}

const sql = postgres(DATABASE_URL!, { max: 4, onnotice: () => {} });
const admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ------------------------------------------------------------ determinism */

let seedState = 20260821;
function rand(): number {
  // Mulberry32 — small, fast, and reproducible across runs.
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;

/* ------------------------------------------------------------- name pools */

const FIRST_M = ["Aarav","Rohit","Sahil","Vikas","Imran","Deepak","Arjun","Karan","Rahul","Sameer","Nitin","Pankaj","Ajay","Suraj","Manish","Ravi","Golu","Chhotu","Anil","Farhan","Yash","Tushar","Gaurav","Akash","Bittu","Raju","Mohit","Sonu","Vishal","Amit"];
const FIRST_F = ["Asha","Priya","Kavita","Sunita","Pooja","Anjali","Rekha","Nisha","Sanjana","Meena","Laxmi","Rani","Shabnam","Sapna","Radha","Jyoti","Komal","Payal","Sita","Roshni","Muskan","Neha","Tanvi","Kiran","Aarti","Bhavna","Chetna","Divya","Geeta","Heena"];
const LAST = ["Sharma","Verma","Yadav","Kumar","Patil","Chauhan","Rathod","Ansari","Gupta","Sahu","Meshram","Dhote","Bhosale","Nikam","Thakre","Wankhede","Pawar","Kamble","Solanki","Jaiswal","Tiwari","Mishra","Shinde","Ingle","Raut"];

const VOL_FIRST = ["Ananya","Rohan","Sneha","Aditya","Ishita","Kunal","Tanya","Varun","Megha","Siddharth","Pallavi","Nikhil","Shreya","Abhishek","Ritika","Harsh","Divya","Rajat","Swati","Aman","Neelam","Pratik","Kritika","Sagar","Bhavya","Om","Ira","Dev","Nandini","Yogesh","Trisha","Kabir","Sanya","Vivek","Ayesha","Mayank","Juhi","Parth","Riya","Ashwin","Lata","Naveen","Sonal","Ujjwal","Prerna","Girish","Anita","Farida","Manoj","Charu","Zoya","Ketan","Bhavesh","Ruchi","Tarun","Ila","Nikita","Rishi","Sameera","Aakash"];

const GUARDIAN_REL = ["Father","Mother","Grandmother","Uncle","Aunt","Elder brother"];
const SKILLS = ["Mathematics","English","Hindi","Storytelling","Art & craft","Music","Sports","Computer basics","Science","Counselling"];

const SUBJECTS = ["Literacy","Numeracy","Environmental Studies","Life Skills","English","Art & Expression"];
const LEVELS = ["foundation", "level_1", "level_2", "level_3", "bridge"] as const;

/* ------------------------------------------------------------------ zones */

const ZONES = [
  { name: "Nagpur Central", city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { name: "Nagpur East", city: "Nagpur", state: "Maharashtra", lat: 21.1702, lng: 79.1200 },
  { name: "Delhi NCR", city: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Bhopal", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { name: "Jaipur", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { name: "Pune", city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
];

const CENTER_NAMES = [
  ["Sitabuldi Signal", "Variety Square", "Zero Mile Footpath", "Gandhibagh Basti"],
  ["Kalamna Market", "Pardi Crossing", "Bhandewadi Basti"],
  ["Nizamuddin Flyover", "Sarai Kale Khan", "Okhla Signal", "Kashmere Gate"],
  ["New Market Signal", "Habibganj Basti", "Bairagarh Footpath"],
  ["Sindhi Camp", "Jhotwara Basti", "Amer Road Signal"],
  ["Swargate Signal", "Yerawada Basti", "Kothrud Footpath"],
];

/** The centre whose attendance is engineered to visibly decline. */
const DECLINING_CENTER = "Sitabuldi Signal";
/** Centres deliberately left short of volunteers. */
const UNDERSTAFFED = new Set(["Bhandewadi Basti", "Amer Road Signal"]);

/* ------------------------------------------------------------- date helpers */

const TODAY = new Date("2026-08-21T00:00:00Z");
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Class days over the last six months: Monday, Wednesday, Friday, Saturday. */
function sessionDates(): Date[] {
  const out: Date[] = [];
  for (let i = 182; i >= 0; i--) {
    const d = addDays(TODAY, -i);
    if ([1, 3, 5, 6].includes(d.getUTCDay())) out.push(d);
  }
  return out;
}

/* ---------------------------------------------------------------- auth users */

interface SeedUser {
  email: string;
  full_name: string;
  role: "admin" | "coordinator" | "teacher" | "volunteer" | "student";
  id?: string;
}

async function createUsers(users: SeedUser[]) {
  const CONCURRENCY = 8;
  let done = 0;
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const slice = users.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (u) => {
        const { data, error } = await admin.auth.admin.createUser({
          email: u.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.full_name, role: u.role },
        });
        if (error) {
          // Re-running the seed is normal; reuse the existing account.
          if (/already been registered|already exists/i.test(error.message)) {
            const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const found = list?.users.find((x) => x.email === u.email);
            if (found) u.id = found.id;
            return;
          }
          throw new Error(`createUser ${u.email}: ${error.message}`);
        }
        u.id = data.user!.id;
      }),
    );
    done += slice.length;
    process.stdout.write(`\r  auth users: ${done}/${users.length}`);
  }
  process.stdout.write("\n");
}

/* ------------------------------------------------------------------- main */

async function main() {
  console.log("Clearing existing data ...");
  await sql`truncate table
    ai_queries, badges, certificates, assessment_results, assessments,
    center_curriculum, curriculum_units, volunteer_checkins, attendance,
    class_sessions, students, centers, zones
    restart identity cascade`;
  await sql`delete from profiles`;

  // Remove previously seeded auth users so ids stay consistent across runs.
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const stale = (existing?.users ?? []).filter((u) => u.email?.endsWith("@upay.org"));
  if (stale.length) {
    console.log(`Removing ${stale.length} previously seeded accounts ...`);
    for (const u of stale) await admin.auth.admin.deleteUser(u.id);
  }

  /* ---------------------------------------------------------- 1. accounts */

  const demoUsers: SeedUser[] = [
    { email: "admin@upay.org", full_name: "Meera Deshpande", role: "admin" },
    { email: "coordinator@upay.org", full_name: "Sandeep Raut", role: "coordinator" },
    { email: "teacher@upay.org", full_name: "Farhana Sheikh", role: "teacher" },
    { email: "volunteer@upay.org", full_name: "Ankit Bhosale", role: "volunteer" },
  ];

  const coordinators: SeedUser[] = ZONES.slice(1).map((z, i) => ({
    email: `coordinator.${z.name.toLowerCase().replace(/\s+/g, "")}@upay.org`,
    full_name: `${pick(VOL_FIRST)} ${LAST[i % LAST.length]}`,
    role: "coordinator",
  }));

  const teachers: SeedUser[] = Array.from({ length: 8 }, (_, i) => ({
    email: `teacher${i + 1}@upay.org`,
    full_name: `${pick(VOL_FIRST)} ${pick(LAST)}`,
    role: "teacher",
  }));

  const volunteers: SeedUser[] = Array.from({ length: 56 }, (_, i) => ({
    email: `volunteer${i + 1}@upay.org`,
    full_name: `${VOL_FIRST[i % VOL_FIRST.length]} ${pick(LAST)}`,
    role: "volunteer",
  }));

  const allUsers = [...demoUsers, ...coordinators, ...teachers, ...volunteers];
  console.log(`Creating ${allUsers.length} accounts ...`);
  await createUsers(allUsers);

  /* ------------------------------------------------------------- 2. zones */

  console.log("Inserting zones and centres ...");
  const zoneRows = await sql<{ id: string; name: string }[]>`
    insert into zones ${sql(ZONES.map((z) => ({ name: z.name, city: z.city, state: z.state })))}
    returning id, name
  `;
  const zoneId = new Map(zoneRows.map((z) => [z.name, z.id]));

  /* ----------------------------------------------------------- 3. centres */

  const centerPayload = ZONES.flatMap((zone, zi) =>
    CENTER_NAMES[zi].map((name, ci) => ({
      zone_id: zoneId.get(zone.name)!,
      name,
      code: `${zone.city.slice(0, 3).toUpperCase()}-${String(ci + 1).padStart(2, "0")}`,
      address: `Near ${name}, ${zone.city}`,
      // Scatter centres a few hundred metres around the zone centroid.
      lat: zone.lat + (rand() - 0.5) * 0.05,
      lng: zone.lng + (rand() - 0.5) * 0.05,
      radius_m: 300,
      started_on: ymd(addDays(TODAY, -randInt(400, 1500))),
      active: true,
    })),
  );
  const centerRows = await sql<{ id: string; name: string; zone_id: string }[]>`
    insert into centers ${sql(centerPayload)} returning id, name, zone_id
  `;
  const centerByName = new Map(centerRows.map((c) => [c.name, c]));

  /* ---------------------------------------------------------- 4. profiles */

  console.log("Assigning people to zones and centres ...");
  const zoneNames = ZONES.map((z) => z.name);

  // Demo admin sees everything; demo coordinator is scoped to Nagpur Central.
  await sql`update profiles set zone_id = ${zoneId.get("Nagpur Central")!}
            where email = 'coordinator@upay.org'`;

  for (const [i, c] of coordinators.entries()) {
    await sql`update profiles set zone_id = ${zoneId.get(zoneNames[i + 1])!}
              where id = ${c.id!}`;
  }

  const centerIds = centerRows.map((c) => c.id);
  const demoCenter = centerByName.get(DECLINING_CENTER)!;

  await sql`update profiles set center_id = ${demoCenter.id},
              zone_id = ${demoCenter.zone_id}, skills = ${sql.array(["Mathematics", "Storytelling"])}
            where email in ('teacher@upay.org', 'volunteer@upay.org')`;

  const fieldStaff = [...teachers, ...volunteers];
  for (const [i, u] of fieldStaff.entries()) {
    // Understaffed centres deliberately receive fewer people.
    let center = centerRows[i % centerRows.length];
    if (UNDERSTAFFED.has(center.name) && chance(0.7)) {
      center = centerRows[(i + 3) % centerRows.length];
    }
    const skills = [pick(SKILLS), pick(SKILLS)].filter((v, idx, a) => a.indexOf(v) === idx);
    await sql`update profiles set
                center_id = ${center.id},
                zone_id = ${center.zone_id},
                phone = ${`+91 9${randInt(100000000, 999999999)}`},
                skills = ${sql.array(skills)},
                availability = ${pick(["Weekday evenings", "Weekends", "Weekday mornings", "Flexible"])},
                joined_on = ${ymd(addDays(TODAY, -randInt(30, 900)))}
              where id = ${u.id!}`;
  }

  // Zone coordinators own their zone.
  await sql`update zones z set coordinator_id = p.id
            from profiles p
            where p.role = 'coordinator' and p.zone_id = z.id`;

  /* ---------------------------------------------------------- 5. students */

  console.log("Enrolling students ...");
  const studentPayload: Record<string, unknown>[] = [];
  let studentSeq = 1;
  for (const center of centerRows) {
    const count = randInt(16, 26);
    for (let i = 0; i < count; i++) {
      const female = chance(0.47);
      const first = female ? pick(FIRST_F) : pick(FIRST_M);
      const age = randInt(6, 14);
      studentPayload.push({
        center_id: center.id,
        full_name: `${first} ${pick(LAST)}`,
        student_code: `UPY-${String(studentSeq++).padStart(4, "0")}`,
        dob: ymd(addDays(TODAY, -age * 365 - randInt(0, 364))),
        gender: female ? "F" : "M",
        guardian_name: `${chance(0.5) ? pick(FIRST_F) : pick(FIRST_M)} ${pick(LAST)}`,
        guardian_phone: `+91 9${randInt(100000000, 999999999)}`,
        level: age <= 7 ? "foundation" : age <= 9 ? "level_1" : age <= 11 ? "level_2" : chance(0.6) ? "level_3" : "bridge",
        enrolled_on: ymd(addDays(TODAY, -randInt(20, 700))),
        active: chance(0.94),
        notes: chance(0.12) ? `Guardian is ${pick(GUARDIAN_REL).toLowerCase()}; works near the signal.` : null,
      });
    }
  }
  const studentRows = await sql<{ id: string; center_id: string; level: string }[]>`
    insert into students ${sql(studentPayload)} returning id, center_id, level
  `;
  const studentsByCenter = new Map<string, typeof studentRows>();
  for (const s of studentRows) {
    if (!studentsByCenter.has(s.center_id)) studentsByCenter.set(s.center_id, [] as never);
    studentsByCenter.get(s.center_id)!.push(s);
  }

  // A cohort deliberately marked as struggling, so "who is falling behind" has
  // a real answer rather than a statistical accident.
  const atRisk = new Set(
    studentRows.filter(() => chance(0.09)).map((s) => s.id),
  );

  /* -------------------------------------------------------- 6. curriculum */

  console.log("Building curriculum ...");
  const unitPayload = SUBJECTS.flatMap((subject) =>
    LEVELS.map((level, li) => ({
      title: `${subject} — ${["Getting started", "Building blocks", "Practice", "Applying it", "Bridging to school"][li]}`,
      subject,
      level,
      description: `${subject} unit pitched at the ${level.replace("_", " ")} group.`,
      content_md: `## ${subject}\n\nActivities for a 45-minute footpath session. Bring chalk, flashcards and the story cards.\n\n1. Warm-up circle (5 min)\n2. Core activity (25 min)\n3. Pair practice (10 min)\n4. Closing recap (5 min)`,
      duration_min: pick([30, 45, 60]),
      sequence_no: li + 1,
    })),
  );
  const unitRows = await sql<{ id: string; subject: string; level: string }[]>`
    insert into curriculum_units ${sql(unitPayload)} returning id, subject, level
  `;

  const schedulePayload: Record<string, unknown>[] = [];
  for (const center of centerRows) {
    for (let w = 0; w < 12; w++) {
      const unit = pick(unitRows);
      const when = addDays(TODAY, -w * 7 + randInt(0, 4));
      schedulePayload.push({
        center_id: center.id,
        unit_id: unit.id,
        scheduled_for: ymd(when),
        status: when > TODAY ? "scheduled" : chance(0.85) ? "delivered" : "skipped",
        delivered_on: when <= TODAY && chance(0.85) ? ymd(when) : null,
      });
    }
  }
  await sql`insert into center_curriculum ${sql(schedulePayload)} on conflict do nothing`;

  /* ---------------------------------------------- 7. sessions and attendance */

  console.log("Generating six months of attendance ...");
  const dates = sessionDates();
  const staffByCenter = new Map<string, string[]>();
  const staffRows = await sql<{ id: string; center_id: string }[]>`
    select id, center_id from profiles where center_id is not null and role in ('teacher','volunteer')
  `;
  for (const s of staffRows) {
    if (!staffByCenter.has(s.center_id)) staffByCenter.set(s.center_id, []);
    staffByCenter.get(s.center_id)!.push(s.id);
  }

  const sessionPayload: Record<string, unknown>[] = [];
  for (const center of centerRows) {
    const staff = staffByCenter.get(center.id) ?? [];
    for (const d of dates) {
      // Not every centre runs every scheduled day.
      if (chance(0.12)) continue;
      sessionPayload.push({
        center_id: center.id,
        conducted_by: staff.length ? pick(staff) : null,
        session_date: ymd(d),
        subject: pick(SUBJECTS),
        faces_detected: 0,
        auto_matched: 0,
        lat: null,
        lng: null,
      });
    }
  }
  const sessionRows = await sql<{ id: string; center_id: string; session_date: string }[]>`
    insert into class_sessions ${sql(sessionPayload)} returning id, center_id, session_date
  `;
  console.log(`  ${sessionRows.length} sessions`);

  const decliningId = demoCenter.id;
  const attendancePayload: Record<string, unknown>[] = [];

  for (const session of sessionRows) {
    const roster = studentsByCenter.get(session.center_id) ?? [];
    const dayIndex = dates.findIndex((d) => ymd(d) === String(session.session_date).slice(0, 10));
    const progress = dayIndex < 0 ? 1 : dayIndex / dates.length; // 0 = oldest, 1 = newest

    // Baseline attendance rate, with one centre engineered to slide from ~78% to ~51%.
    let rate = 0.72 + (rand() - 0.5) * 0.08;
    if (session.center_id === decliningId) rate = 0.78 - progress * 0.27;
    if (UNDERSTAFFED.has(centerRows.find((c) => c.id === session.center_id)?.name ?? "")) rate -= 0.06;

    for (const student of roster) {
      let p = rate;
      if (atRisk.has(student.id)) p -= 0.3;
      const present = chance(Math.max(0.05, Math.min(0.97, p)));
      const late = present && chance(0.09);
      attendancePayload.push({
        session_id: session.id,
        student_id: student.id,
        status: present ? (late ? "late" : "present") : "absent",
        // Historic records were captured manually; recent ones came from the app.
        method: progress > 0.82 && chance(0.7) ? "face" : "manual",
        confidence: progress > 0.82 && chance(0.7) ? Number((0.72 + rand() * 0.27).toFixed(2)) : null,
      });
    }
  }

  console.log(`  writing ${attendancePayload.length} attendance rows ...`);
  const CHUNK = 4000;
  for (let i = 0; i < attendancePayload.length; i += CHUNK) {
    await sql`insert into attendance ${sql(attendancePayload.slice(i, i + CHUNK))} on conflict do nothing`;
    process.stdout.write(`\r  ${Math.min(i + CHUNK, attendancePayload.length)}/${attendancePayload.length}`);
  }
  process.stdout.write("\n");

  // Backfill the per-session face-recognition counters from what was written.
  await sql`
    update class_sessions cs set
      faces_detected = agg.detected,
      auto_matched = agg.matched
    from (
      select session_id,
             count(*) filter (where method = 'face') as detected,
             count(*) filter (where method = 'face' and status <> 'absent') as matched
      from attendance group by session_id
    ) agg
    where agg.session_id = cs.id and agg.detected > 0
  `;

  /* ------------------------------------------------------- 8. volunteer log */

  console.log("Logging volunteer check-ins ...");
  const checkinPayload: Record<string, unknown>[] = [];
  const starVolunteers = new Set(volunteers.slice(0, 6).map((v) => v.id!));

  for (const staff of staffRows) {
    const center = centerRows.find((c) => c.id === staff.center_id)!;
    const centerMeta = centerPayload.find((c) => c.name === center.name)!;
    const isStar = starVolunteers.has(staff.id);
    const shifts = isStar ? randInt(60, 90) : randInt(6, 40);
    for (let i = 0; i < shifts; i++) {
      const day = addDays(TODAY, -randInt(1, 180));
      const start = new Date(day);
      start.setUTCHours(randInt(9, 17), pick([0, 15, 30, 45]), 0, 0);
      const hours = pick([1.5, 2, 2, 2.5, 3]);
      const verified = chance(0.88);
      checkinPayload.push({
        volunteer_id: staff.id,
        center_id: staff.center_id,
        check_in_at: start.toISOString(),
        check_out_at: new Date(start.getTime() + hours * 3_600_000).toISOString(),
        // Verified check-ins sit inside the geofence; the rest drifted outside it.
        lat: (centerMeta.lat as number) + (verified ? (rand() - 0.5) * 0.002 : (rand() - 0.5) * 0.03),
        lng: (centerMeta.lng as number) + (verified ? (rand() - 0.5) * 0.002 : (rand() - 0.5) * 0.03),
        distance_m: verified ? randInt(5, 280) : randInt(400, 2400),
        location_verified: verified,
      });
    }
  }
  for (let i = 0; i < checkinPayload.length; i += CHUNK) {
    await sql`insert into volunteer_checkins ${sql(checkinPayload.slice(i, i + CHUNK))}`;
  }
  console.log(`  ${checkinPayload.length} check-ins`);

  /* -------------------------------------------------------- 9. assessments */

  console.log("Creating assessments ...");
  const assessmentPayload = LEVELS.flatMap((level) =>
    ["Numeracy", "Literacy"].map((subject) => {
      const questions = Array.from({ length: 8 }, (_, i) => ({
        n: i + 1,
        type: i < 5 ? "mcq" : "short",
        prompt:
          subject === "Numeracy"
            ? `What is ${randInt(2, 9)} × ${randInt(2, 9)}?`
            : `Write the opposite of the word "${pick(["big", "hot", "fast", "day", "happy"])}".`,
        options: i < 5 ? ["A", "B", "C", "D"] : undefined,
        marks: i < 5 ? 1 : 2,
      }));
      return {
        title: `${subject} check — ${level.replace("_", " ")}`,
        subject,
        level,
        ai_generated: false,
        total_marks: questions.reduce((s, q) => s + q.marks, 0),
        questions: JSON.stringify(questions),
        answer_key: JSON.stringify(
          questions.map((q) => ({ n: q.n, answer: q.type === "mcq" ? pick(["A", "B", "C", "D"]) : "sample" })),
        ),
      };
    }),
  );
  const assessmentRows = await sql<{ id: string; level: string; total_marks: number }[]>`
    insert into assessments ${sql(assessmentPayload)} returning id, level, total_marks
  `;

  const resultPayload: Record<string, unknown>[] = [];
  for (const student of studentRows) {
    const matching = assessmentRows.filter((a) => a.level === student.level);
    for (const assessment of matching) {
      if (!chance(0.6)) continue;
      const base = atRisk.has(student.id) ? 0.34 : 0.68;
      const ratio = Math.max(0.05, Math.min(1, base + (rand() - 0.5) * 0.35));
      resultPayload.push({
        assessment_id: assessment.id,
        student_id: student.id,
        score: Number((assessment.total_marks * ratio).toFixed(2)),
        max_score: assessment.total_marks,
        graded_by_ai: chance(0.4),
        taken_on: ymd(addDays(TODAY, -randInt(5, 150))),
      });
    }
  }
  for (let i = 0; i < resultPayload.length; i += CHUNK) {
    await sql`insert into assessment_results ${sql(resultPayload.slice(i, i + CHUNK))} on conflict do nothing`;
  }
  console.log(`  ${resultPayload.length} assessment results`);

  /* ------------------------------------------------------ 10. certificates */

  console.log("Issuing certificates ...");
  const hoursByVolunteer = await sql<{ volunteer_id: string; hours: string; shifts: string }[]>`
    select volunteer_id, sum(hours)::text as hours, count(*)::text as shifts
    from volunteer_checkins group by volunteer_id
  `;
  const certPayload = hoursByVolunteer
    .filter((v) => Number(v.hours) >= 100)
    .map((v, i) => ({
      volunteer_id: v.volunteer_id,
      cert_type: Number(v.hours) >= 250 ? "service_250" : "service_100",
      serial: `UPAY-CERT-2026-${String(i + 1).padStart(4, "0")}`,
      hours: Number(Number(v.hours).toFixed(2)),
      sessions_count: Number(v.shifts),
      period_start: ymd(addDays(TODAY, -180)),
      period_end: ymd(TODAY),
    }));
  if (certPayload.length) {
    await sql`insert into certificates ${sql(certPayload)} on conflict do nothing`;
  }
  console.log(`  ${certPayload.length} certificates`);

  /* -------------------------------------------------------------- summary */

  const [summary] = await sql<{ [k: string]: string }[]>`
    select
      (select count(*)::text from zones) as zones,
      (select count(*)::text from centers) as centers,
      (select count(*)::text from students) as students,
      (select count(*)::text from profiles where role in ('volunteer','teacher')) as staff,
      (select count(*)::text from class_sessions) as sessions,
      (select count(*)::text from attendance) as attendance,
      (select count(*)::text from volunteer_checkins) as checkins,
      (select count(*)::text from assessment_results) as results
  `;

  console.log("\nSeed complete:");
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(12)} ${v}`);
  console.log(`\nDemo sign-in: admin@upay.org / ${DEMO_PASSWORD}`);

  await sql.end();
}

main().catch(async (err) => {
  console.error("\nSeed failed:\n", err);
  await sql.end();
  process.exit(1);
});
