# Footpathshala Assistant — Chatbot Knowledge Base

Source content for the Botpress chatbot embedded in the UPAY Footpathshala
operations platform. Audience: **logged-in platform users** — Admins, Zone
Coordinators, Teachers, Volunteers, and Students — plus a light FAQ section
for people who land on the public homepage before signing in.

## How to use this file in Botpress

- **Knowledge Base tab:** upload this file directly (or paste section 3
  onward) — Botpress will chunk and embed it for retrieval-based answers.
- **QnA node / FAQ table:** each `**Q:** / **A:**` pair below can be copied
  into a QnA node one-for-one if you'd rather hand-curate exact-match
  answers instead of relying on retrieval.
- **Navigation buttons:** section 7's table is meant to become quick-reply
  buttons or a "Where do I find…" choice node, using the Route column as the
  button's link target.
- Anything in `[BRACKETS]` is a placeholder — fill in with the real value
  before publishing the bot.

---

## 1. Bot persona & system prompt

Paste this into Botpress as the bot's system/instructions prompt:

> You are the Footpathshala Assistant, a help bot embedded in UPAY's
> Footpathshala operations platform (the internal app staff, coordinators,
> teachers and volunteers use to run the programme — not the child-facing
> classroom). Your job is to (1) help users find the right screen for what
> they're trying to do, (2) answer how-the-platform-works questions using
> the knowledge base, and (3) hand off to a human when you can't help.
>
> Rules:
> - Never invent numbers, policies, or thresholds that aren't in your
>   knowledge base. If you don't know, say so and offer escalation.
> - Never answer questions about a *specific* child, volunteer, or centre's
>   live data (e.g. "how many hours does Priya have") — that lives behind
>   row-level security in the app itself; tell the user which screen shows
>   it (usually Dashboard, UpayGPT, or the relevant profile page) instead
>   of guessing an answer.
> - Keep answers short — 2-4 sentences — with a follow-up offer to open the
>   relevant page or connect them to a person.
> - If a user sounds blocked, frustrated, or says a direct request three
>   times without resolution, escalate proactively rather than waiting to
>   be asked.

---

## 2. Landing page FAQ (pre-login)

**Q: What is this website / platform?**
A: This is UPAY's Footpathshala operations platform — the system UPAY uses
to run its footpath schools: tracking attendance, volunteer service hours,
lessons taught, and assessment results across all its centres. It replaced
a set of spreadsheets that didn't talk to each other.

**Q: What is UPAY / Footpathshala?**
A: UPAY (Underprivileged Advancement by Youth) runs Footpathshala, a
programme that teaches children who have no classroom — at traffic
signals, on pavements, in bastis — across multiple zones and centres.

**Q: Is my child's photo stored when attendance is taken?**
A: No. Attendance photos are processed entirely in the volunteer's browser.
The photo is never uploaded and there's nowhere in the system to store it —
only a 128-number mathematical descriptor per child is saved, which can't
be turned back into an image.

**Q: How do I get an account / log in?**
A: Accounts are created by your Admin or Zone Coordinator, not through
self-signup on this site. If you don't have login credentials yet, contact
[ADMIN_CONTACT] or your Zone Coordinator.

**Q: I forgot my password.**
A: [PASSWORD_RESET_INSTRUCTIONS — fill in once the auth flow / reset page
exists, or point to whoever manually resets accounts today.]

**Q: Is this only for staff, or can parents/donors use it too?**
A: The platform itself is for UPAY staff, coordinators, teachers and
volunteers running the programme. If you're looking to volunteer, donate,
or learn more generally, contact [PUBLIC_CONTACT_EMAIL].

---

## 3. Roles — who can see and do what

This mirrors the platform's actual permission rules (enforced in the
database, not just hidden menus), so answers here should always match what
the user is actually able to click into.

| Role | Sees | Can do |
|---|---|---|
| **Administrator** | Every zone | Manage everything, issue certificates, import data, manage people & roles |
| **Zone Coordinator** | Their own zone | Manage centres and volunteers in their zone, see zone analytics |
| **Teacher** | Their own centre | Curriculum, assessments, attendance, student progress |
| **Volunteer** | Their own centre | Attendance, check-in, grading answer sheets |
| **Student** | Their own record | View their own progress and certificates |

**Q: Why can't I see other zones / centres?**
A: That's by design. Your role restricts what data you can query, and it's
enforced at the database level — so it applies everywhere, including in
UpayGPT, not just on menus you can't click. If you need visibility into
another zone, that has to be granted by an Admin.

**Q: I'm a Teacher — why don't I see "Zones" or "Volunteers" management in the menu?**
A: Those areas are limited to Admins and Zone Coordinators. Teachers and
Volunteers work at the centre level — Attendance, Curriculum, Assessments,
Check-in, and Certificates are the areas you'll use.

**Q: How do I get a role changed, or get added to a different centre?**
A: Only an Admin can change roles or reassign someone to a different
centre/zone, via People & roles. Ask your Admin or Zone Coordinator.

---

## 4. Module FAQs

### Dashboard
*Everyone sees this — it's the home screen after signing in, scoped to what your role can see.*

**Q: What's on the Dashboard?**
A: A quick summary for your scope — children, attendance rate, volunteers,
and upcoming or recently delivered lessons. Admins and Coordinators see
zone/programme-wide numbers; Teachers and Volunteers see their centre.

**Q: The numbers on my Dashboard look wrong / out of date.**
A: Dashboard figures are calculated from attendance and check-in records as
they're entered, so a session that hasn't been marked yet won't show. If
numbers still look wrong after checking that, ask UpayGPT the same question
directly, or escalate — see [Section 6](#6-troubleshooting).

### Attendance (face recognition)
**Q: How does Attendance work?**
A: Take one photo of the class. The app detects and matches faces against
that centre's roster right there in your browser, and shows you each match
with a confidence score. You review the matches and can correct any row
before saving — the app never finalizes a match you haven't confirmed.

**Q: Is the class photo saved anywhere?**
A: No. It's decoded, measured, and discarded on your device. What's saved
per child is a 128-number descriptor, not an image — there's no field in
the database that could hold a photo.

**Q: A child wasn't recognised / was matched to the wrong name.**
A: This is expected sometimes — lighting, angle, or a child not yet
enrolled with a clear reference photo can affect matching confidence.
Correct it manually in the review step before you save; your correction is
what gets recorded, not the model's first guess.

**Q: Can I mark attendance without a photo?**
A: [MANUAL_ATTENDANCE_FLOW — confirm whether a manual/roll-call fallback
exists; if not, say photo-based marking is the only method today and route
to escalation for edge cases like a damaged phone camera.]

### Check-in (geo-verified)
**Q: What does "Check in" do?**
A: It records your service session and verifies you were actually at the
centre. The app checks your device's location against the centre's
coordinates and a set radius (300 metres by default for a centre).

**Q: My check-in says "unverified" — did it fail?**
A: No — it's still recorded. If you check in from outside the centre's
radius, the shift is saved but flagged as unverified rather than rejected,
since GPS can be imprecise indoors or near buildings. It just won't count
toward geo-verified totals (which matter for the Outstanding Service award
— see Certificates below).

**Q: Why does check-in need my location at all?**
A: So volunteer hours reflect where someone actually was, not just what
they typed in. It's recomputed on the server, not trusted from the device
alone.

### Students
**Q: What's in the Students area?**
A: Each child's profile — attendance history, assessment results, and
progress — scoped to your centre (or your whole zone/programme for
Coordinators/Admins).

**Q: How do I add a new student?**
A: [ADD_STUDENT_FLOW — confirm exact entry point: likely a button on the
Students page, available to Teacher role and above.]

### Centres
**Q: What's a "Centre" in this system?**
A: A physical teaching location — a specific signal, pavement spot, or
basti where a Footpathshala session runs. Centres belong to a Zone and have
a set location and check-in radius.

**Q: I need a new centre added, or an existing one's radius changed.**
A: That's an Admin or Zone Coordinator action — ask them to add/edit it
under Centres.

### Zones
*(Admin and Zone Coordinator only)*

**Q: What's a Zone?**
A: A geographic grouping of centres — Nagpur Central is one example. Zone
Coordinators are scoped to their zone; Admins see all zones.

### Volunteers
*(Admin and Zone Coordinator only)*

**Q: Where do I see volunteer service hours and certificate progress?**
A: Under Volunteers — it lists each volunteer's logged hours, verified
shifts, and certificate eligibility for your zone.

**Q: How do I add a volunteer to my centre?**
A: That's created via People & roles by an Admin, then assigned to a
centre/zone. Coordinators can request this from an Admin if they can't do
it directly.

### Curriculum
**Q: How does Curriculum work?**
A: A lesson is built once and then scheduled across whichever centres need
it. The system tracks whether each scheduled lesson was actually delivered,
not just planned.

**Q: I scheduled a lesson but it's not showing as delivered.**
A: A lesson only shows as delivered once someone marks it complete for that
session — scheduling it doesn't automatically mark it taught. Check the
session's status and update it if the class did happen.

### Assessments
**Q: How are assessments created?**
A: They can be AI-generated at a specific learning level (Foundation,
Level 1, Level 2, Level 3, or Bridge) so the paper matches where a child
actually is, not a fixed grade.

**Q: How is grading done?**
A: Answer sheets are graded from a photo. The AI reads what's written on
the page — it's told not to correct spelling or guess unclear handwriting
— and a separate, tested step decides if the reading is correct. If a
child's handwriting is unclear, it's flagged rather than marked wrong.
Nothing is finalized until a person (Teacher/Volunteer) confirms it.

**Q: The AI misread an answer — can I fix it?**
A: Yes — grading isn't final until you confirm it. Correct it during
review before saving the results.

### Analytics
*(Admin and Zone Coordinator only)*

**Q: What does Analytics show that Dashboard doesn't?**
A: Deeper, comparative views — which centres are slipping in attendance,
which children are falling behind, which centres are short of volunteers —
rather than just current totals.

### UpayGPT
**Q: What is UpayGPT?**
A: A way to ask a question about your programme's data in plain English —
"which centres had the lowest attendance last month?" — and get an answer
plus the exact SQL query it ran, instead of needing to write SQL yourself.

**Q: Can UpayGPT show me data outside my role's scope?**
A: No. Whatever you ask, the query still runs under your own account's
permissions — asking differently doesn't widen what you're allowed to see.
A Coordinator asking about the whole country still only gets their zone.

**Q: UpayGPT gave me an unexpected or empty answer.**
A: Click "see the SQL I ran" to check exactly what was queried — it's
always shown and logged, so you can verify what happened. If the query
looks wrong or you think you should have access to something you don't,
escalate to your Admin.

**Q: Can UpayGPT change data, not just answer questions?**
A: No — it's read-only. It can only run SELECT queries, on a single
statement, with a forced row limit and timeout; it can't modify or delete
anything.

### Certificates
**Q: How are certificates earned?**
A: Automatically, based on logged hours and tenure:
- **Certificate of Participation** — 20+ hours, after being with the
  programme at least 60 days
- **100 Hours of Service** — 100+ hours
- **250 Hours of Service** — 250+ hours
- **Award for Outstanding Service** — 100+ hours, with at least 90% of
  shifts geo-verified on-site, and having led at least 20 sessions

**Q: I have enough hours but no certificate shows up.**
A: Check whether your shifts are geo-verified — the Outstanding Service
award specifically needs 90%+ verified shifts, and general milestones need
the tenure/hours combination above. If the numbers still don't add up
after checking Volunteers/Dashboard, escalate to your Coordinator.

**Q: What does a certificate look like / can I download it?**
A: Each certificate has a serial number (e.g. `UPAY-CERT-2026-0001`) and is
downloadable once issued — check the Certificates page.

### Data import
*(Admin only)*

**Q: What is Data import for?**
A: Bringing in years of legacy spreadsheet records — attendance, students,
volunteers — through a column-mapping step, so historical data doesn't get
left behind when moving to this platform.

**Q: My import failed or mapped columns wrong.**
A: Re-check the column mapping step — most failures come from a column
being mapped to the wrong field or a required field left unmapped. If it
still fails, escalate to [ADMIN_CONTACT] with the file and the error shown.

### People & roles
*(Admin only)*

**Q: What can I do on People & roles?**
A: Create accounts, assign roles (Admin/Coordinator/Teacher/Volunteer/
Student), and assign people to centres/zones. This is also where you'd
deactivate someone who's left the programme.

---

## 5. Language

**Q: Can I use this in Hindi?**
A: Navigation and the controls volunteers use in the field have a Hindi
option — look for the language toggle near your account menu in the top
bar.

---

## 6. Troubleshooting

**Q: I can't log in.**
A: Double-check your email and password. If you're using a demo account,
all demo accounts share one password. If your real account still won't
work, contact [ADMIN_CONTACT] — passwords are reset manually, not
self-service, today.

**Q: A page says I don't have permission / redirects me away.**
A: That's your role's scope working as intended, not a bug — see
[Section 3](#3-roles--who-can-see-and-do-what). If you believe you should
have access, ask your Admin to check your role assignment.

**Q: The app feels slow or a page won't load.**
A: Try refreshing first. If it persists, note which page and roughly what
time it happened, and escalate — see below.

**Q: Something looks wrong with data I didn't enter (wrong numbers, missing records).**
A: Don't try to fix it by re-entering data, since that can create
duplicates. Escalate with specifics (which centre, which date, what you
expected vs. saw) so it can be checked directly in the database.

---

## 7. Escalation — when the bot can't help

Default path: **hand off to the user's Zone Coordinator**, or to an **Admin**
if the user asking *is* a Coordinator (or if the issue is account/role/
permissions related, which only Admins can fix).

Suggested bot reply:

> I can't resolve that directly. The best person to help is your Zone
> Coordinator — [COORDINATOR_CONTACT_METHOD, e.g. "reach them via the phone
> number on your centre's roster" or an actual email/WhatsApp]. For account,
> role, or access issues, contact your Admin instead at [ADMIN_CONTACT].

Trigger phrases to route to escalation (use as intents/utterances in
Botpress): "talk to a person", "this isn't working", "I need help with my
account", "connect me to someone", "this is urgent", "I already tried that
and it's still broken", any repeated failed attempt at the same question.

*(Fill in real contact channels before launch — email, phone, or WhatsApp
for both the general Admin contact and, if you want per-zone routing later,
each Zone Coordinator.)*

---

## 8. "Where do I find…" — navigation intents

Map these to quick-reply buttons or a choice node; the Route column is the
in-app path once signed in.

| User might say | Route | Who sees it |
|---|---|---|
| "mark attendance" / "take attendance" | `/attendance` | Admin, Coordinator, Teacher, Volunteer |
| "check in" / "log my hours" | `/checkin` | Teacher, Volunteer |
| "see students" / "student list" | `/students` | Admin, Coordinator, Teacher, Volunteer |
| "centres" / "list of centres" | `/centers` | Admin, Coordinator, Teacher, Volunteer |
| "zones" | `/zones` | Admin, Coordinator |
| "volunteers" / "volunteer hours" | `/volunteers` | Admin, Coordinator |
| "curriculum" / "lesson plans" | `/curriculum` | Admin, Coordinator, Teacher, Volunteer |
| "assessments" / "grade a test" | `/assessments` | Admin, Coordinator, Teacher, Volunteer |
| "analytics" / "reports" | `/analytics` | Admin, Coordinator |
| "ask a question about the data" / "UpayGPT" | `/upaygpt` | Admin, Coordinator, Teacher, Volunteer |
| "my certificate" / "certificates" | `/certificates` | Everyone |
| "import data" / "upload spreadsheet" | `/import` | Admin |
| "add a user" / "people and roles" / "change someone's role" | `/team` | Admin |
| "dashboard" / "home" | `/dashboard` | Everyone |

---

## Open placeholders to fill in before launch

- `[ADMIN_CONTACT]` — real contact for account/access issues
- `[PUBLIC_CONTACT_EMAIL]` — general public inquiries (from the landing page)
- `[COORDINATOR_CONTACT_METHOD]` — how the bot tells someone to reach their
  Zone Coordinator
- `[PASSWORD_RESET_INSTRUCTIONS]` — once confirmed
- `[MANUAL_ATTENDANCE_FLOW]` and `[ADD_STUDENT_FLOW]` — confirm these exist
  or remove the Q&A if they don't
