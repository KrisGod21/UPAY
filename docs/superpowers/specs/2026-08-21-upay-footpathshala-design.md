# UPAY Footpathshala — Digital Operations Platform

**Date:** 2026-08-21
**Context:** 18-hour hackathon. Deliverable is a deployed, working website.

## Problem

UPAY's Footpathshala program runs across zones, centers, volunteers and students on
manual, fragmented records — roughly 1,600 staff-hours per month spent on data
organisation rather than teaching. The organisation needs one platform that digitises
operations end to end and turns the resulting data into decisions.

## Goals

1. Manage the hierarchy Zone → Center → Students / Volunteers with role-scoped access.
2. Replace manual roll-call with face-recognition attendance from a single class photo.
3. Give volunteers geo-verified check-in and automatic service-hour accounting.
4. Generate and grade assessments with AI, keeping a human in the loop.
5. Manage and schedule curriculum across centers.
6. Surface analytics that answer operational questions, not just store records.
7. Let non-technical staff query the data in plain language (UpayGPT).
8. Issue volunteer certificates automatically on eligibility.
9. Import existing records from CSV.

## Non-goals

- Native mobile apps. The deliverable is a responsive website; mobile comes later.
- Real donor/payment processing.
- Production-grade offline sync. A localStorage retry queue for attendance only.

## Architecture

A single Next.js App Router monolith deployed on Vercel, backed by Supabase
(Postgres + Auth + Storage + Row Level Security). Server Actions and Route Handlers
replace a separate REST tier. AI calls run server-side in Route Handlers; face
recognition runs entirely client-side in the browser.

Rejected alternatives:

- **Separate FastAPI backend + React SPA.** Two deploys, two auth wirings, CORS —
  roughly four hours of plumbing that buys nothing the monolith lacks.
- **Prisma + NextAuth + Neon.** Migrations, serverless connection pooling and
  hand-rolled auth are three independent failure modes. Supabase collapses all three.

### Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router, TS) | Single deploy unit, Server Actions |
| Styling | Tailwind v4 + hand-rolled shadcn-style primitives | No registry round-trip |
| Database / Auth / Storage | Supabase | One signup covers three needs; RLS is real access control |
| Face recognition | `@vladmandic/face-api` | Maintained fork on tfjs 4; original face-api.js is pinned to tfjs 1.x and breaks modern bundlers |
| LLM / Vision | Google Gemini 2.5 Flash (`@google/genai`) | Free tier; multimodal OCR removes the Tesseract dependency |
| Charts | Recharts | React-native API; LLM emits a chart spec that maps to it directly |
| Maps | react-leaflet + OpenStreetMap | No API key |
| PDF | jsPDF | Client-side certificate generation |
| CSV | papaparse | Import with column mapping |
| Tests | Vitest | Fast, no config ceremony |

## Data model

`zones` → `centers` → `students`. Identity lives in `profiles`, keyed to `auth.users`,
carrying a role enum (`admin`, `coordinator`, `volunteer`, `teacher`, `student`).

Core tables: `zones`, `centers`, `profiles`, `students`, `class_sessions`,
`attendance`, `volunteer_checkins`, `curriculum_units`, `center_curriculum`,
`assessments`, `assessment_results`, `certificates`, `ai_queries`, `badges`.

Access control is enforced by RLS policies in Postgres, not only in the UI. Admins see
everything; coordinators are scoped to their zone; volunteers and teachers to their
center; students to their own record.

## Face-recognition attendance

Enrolment stores a 128-dimension descriptor per student — **the vector only, never the
photograph**. At class time:

1. Volunteer captures or uploads one group photo.
2. Detection and descriptor extraction run **in the browser** (SSD MobileNet v1 +
   FaceNet-style embedding). No image is uploaded.
3. Each descriptor is matched by Euclidean distance against that center's roster,
   threshold 0.5.
4. The volunteer sees a roster with per-student confidence and can override any row
   before submitting.
5. The session is stamped with browser geolocation.

Two consequences worth stating plainly: raw images of minors never leave the device and
are never stored, and inference costs nothing per use and tolerates a weak connection.

If the network is unavailable at submit time the payload is queued in localStorage and
retried, with a visible banner.

## UpayGPT — natural-language analytics

Question → Gemini generates SQL against a supplied schema description → the SQL passes a
guard → executes against Postgres → Gemini writes a prose answer plus a chart spec →
Recharts renders it.

The guard is the load-bearing part. A generated statement is rejected unless it is a
single statement, begins with `SELECT` or `WITH`, and contains no DDL/DML keywords. It is
then wrapped with an enforced `LIMIT`, run under `default_transaction_read_only = on`
with a 5-second `statement_timeout`, as a non-privileged role.

Every question, its generated SQL, and its result are written to `ai_queries` and shown
to the user in an expandable "see the SQL I ran" panel. This is deliberate: the panel is
what makes the feature auditable rather than a black box, and it is honest about
hallucination risk instead of concealing it.

## Assessments

Generation: Gemini produces a level-tailored paper plus answer key from curriculum
topics, stored as JSONB. Export to print.

Grading: the volunteer photographs the completed sheet; Gemini's vision model reads the
handwriting directly and scores against the key. Multimodal OCR is used in place of
Tesseract because it is markedly better on handwriting and removes a native dependency.

Nothing is written to a student's record until a volunteer confirms or corrects the
result on a verification screen. Human-in-the-loop is part of the design, not a caveat.

## Remaining modules

- **Curriculum:** CRUD over units (subject, level, content), scheduled to centers, with
  delivery tracking.
- **Volunteer check-in:** browser geolocation validated against center coordinates by
  Haversine distance; hours accumulate per volunteer.
- **Certificates:** eligibility computed from hours and tenure; jsPDF generates a
  serial-numbered PDF.
- **Data migration:** CSV upload with a column-mapping step for students and volunteers.
- **i18n:** English / Hindi dictionary toggle.

## Seed data

6 zones, ~20 centers, ~400 students, ~60 volunteers, 6 months of attendance — containing
deliberate signal: one center in measurable decline, an at-risk student cohort, and
standout volunteers. Analytics and UpayGPT are only worth demonstrating if there is
something real to find.

## Testing

Vitest over the logic that fails silently rather than loudly: the SQL guard (injection
attempts must be rejected), descriptor matching, Haversine distance, certificate
eligibility, and CSV column mapping. Coverage is not the target; catching quiet wrong
answers is.

## Delivery phases

1. Scaffold, design system, app shell
2. Schema, RLS, seed
3. Auth and role-based routing
4. Zones / centers / students
5. Volunteers and geo check-in
6. Face enrolment and recognition attendance
7. Curriculum
8. AI assessment generation
9. OCR grading and verification
10. Analytics dashboards
11. UpayGPT
12. Certificates, CSV import, i18n, polish, deploy

## Risks

| Risk | Mitigation |
|---|---|
| face-api model weights (~6MB) slow first load | Lazy-load on the attendance route only; ship weights from `/public/models` |
| Gemini free-tier rate limits during a live demo | Cache the last successful response per question; fall back to a stored example |
| Handwriting OCR accuracy | Verification screen is mandatory; MCQ-style sheets demo first |
| Geolocation denied in the browser | Manual coordinate entry fallback |
| Deploy fails late | Deploy a walking skeleton to Vercel at phase 3, not phase 12 |
