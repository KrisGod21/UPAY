# UPAY Footpathshala — Operations Platform

> Turning footpaths into schools.

UPAY's Footpathshala programme teaches children who have no classroom — at traffic
signals, on pavements, in bastis. It runs across zones, centres, volunteers and
hundreds of children, and it was running on spreadsheets that did not talk to each
other. Roughly **1,600 staff-hours a month** went into organising that data instead
of teaching.

This is one platform that records what actually happens at every centre, and then
answers questions about it in plain language.

---

## What it does

| Module | What it solves |
|---|---|
| **Face-recognition attendance** | One class photograph marks the whole register |
| **UpayGPT** | Natural-language questions → real SQL → answer + chart |
| **AI assessments** | Papers pitched at a learning level; sheets graded from a photo |
| **Geo-verified check-in** | Service hours that reflect where a volunteer actually stood |
| **Curriculum** | Build a lesson once, schedule it across centres, track delivery |
| **Analytics** | Which centre is slipping, which children are falling behind |
| **Certificates** | Issued automatically on a tested eligibility rule |
| **Data import** | Years of legacy spreadsheets, with column mapping |
| **Role-based access** | Enforced by row-level security in Postgres, not by hiding menus |

---

## Three things worth looking at closely

**Face recognition without a database of children's faces.** Detection and
embedding run entirely in the volunteer's browser. The photograph is decoded,
measured, and discarded on the device — it is never uploaded, and the schema has
no column to store it in. What is saved is a 128-number vector per child, which
cannot be turned back into a photograph. Every match is shown with a confidence
reading and the volunteer can override any row before the register is saved.

**UpayGPT shows its working.** A question goes to Gemini with a hand-written
schema description that omits `auth` and `storage` entirely, so the model is never
aware of tables it must not touch. The returned SQL passes an application-side
guard, then the database's own `upaygpt_query()` guard (single statement,
SELECT-only, keyword and object denylist, forced `LIMIT`, read-only transaction,
5-second timeout), then runs under the asking user's RLS. A coordinator asking for
every student in the country still gets only their zone. The generated SQL is
always visible and always logged — an answer nobody can audit is not an answer.

**Grading is split from reading.** The vision model reports what is written and is
instructed not to correct spelling or guess at unclear handwriting. Deciding
whether that answer is *right* is ordinary comparison, kept in its own tested
module. Unreadable answers are flagged rather than silently marked wrong, and
nothing reaches a child's record until a volunteer confirms it.

---

## Stack

Next.js (App Router, TypeScript) · Tailwind v4 · Supabase (Postgres, Auth,
Storage, RLS) · `@vladmandic/face-api` · Google Gemini 2.5 Flash · Recharts ·
jsPDF · Vitest · deployed on Vercel.

---

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the five values
npm run db:push              # create the schema
npm run db:seed              # load six months of realistic data
npm run dev
```

Open http://localhost:3000 and sign in with any demo account below.

### Environment variables

| Key | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` — server-only, bypasses all RLS |
| `DATABASE_URL` | Project Settings → Database → **Session pooler** URI |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `NEXT_PUBLIC_BOTPRESS_INJECT_SRC` (optional) | Botpress Cloud → your bot → Integrations → Webchat → Embed |
| `NEXT_PUBLIC_BOTPRESS_CONFIG_SRC` (optional) | same page, the `files.bpcontent.cloud/.../config.js` link |

Use the **Session pooler** connection string, not `Direct connection` — the direct
host is IPv6-only and will not resolve from most networks. `DATABASE_URL` is used
only by `db:push` and `db:seed`; the deployed app never opens a raw Postgres
connection. The two Botpress variables are optional — the chatbot widget simply
doesn't render until both are set.

### Demo accounts

All use the password in `DEMO_PASSWORD` (default `upay@2026`), and the login page
fills them in on tap.

| Account | Sees |
|---|---|
| `admin@upay.org` | All 6 zones, 20 centres, 440 children |
| `coordinator@upay.org` | Nagpur Central only — 4 centres, 77 children |
| `teacher@upay.org` | One centre — 20 children |
| `volunteer@upay.org` | One centre — 20 children |

Those numbers are enforced by row-level security. Signing in as the coordinator
genuinely restricts what every query returns, including UpayGPT's.

---

## Deploying

```bash
npx vercel login
npx vercel link
npm run vercel:env     # pushes .env.local to the Vercel project
npm run deploy
```

Or import the repository at [vercel.com/new](https://vercel.com/new) and paste the
five environment variables into the project settings.

---

## Tests

```bash
npm test
```

109 tests, covering the logic that fails quietly rather than loudly: the SQL guard
against injection, face-descriptor matching, geofence distance, answer-sheet
grading, certificate eligibility, and CSV column mapping.

---

## The seeded dataset

6 zones, 20 centres, 440 children, 66 volunteers, 1,856 sessions and ~41,000
attendance records over six months — with deliberate signal in it, so the
analytics have something true to find:

- **Sitabuldi Signal** declines from 81% attendance to 45% across the six months
- a cohort of children sits well below the attendance and score thresholds
- two centres are deliberately short of volunteers
- face recognition adoption ramps from 0% to 82% as the app rolls out

Ask UpayGPT *"which centres had the lowest attendance last month?"* and it finds
Sitabuldi on its own.
