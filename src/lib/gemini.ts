import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type { ChartSpec, LearningLevel, Question, AnswerKeyEntry } from "@/lib/types";

const MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

export function geminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function gemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set — the AI features are unavailable.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * The schema the model is allowed to reason about. Deliberately hand-written
 * rather than introspected: it omits auth and storage entirely, so the model is
 * never even aware of tables it must not touch.
 */
export const SCHEMA_PROMPT = `
Postgres schema for an education NGO. All tables are in the public schema.

zones(id uuid, name text, city text, state text, coordinator_id uuid)
centers(id uuid, zone_id uuid -> zones.id, name text, code text, address text,
        lat float8, lng float8, radius_m int, started_on date, active bool)
profiles(id uuid, full_name text, email text,
         role text in ('admin','coordinator','teacher','volunteer','student'),
         phone text, zone_id uuid, center_id uuid, skills text[], joined_on date, active bool)
students(id uuid, center_id uuid -> centers.id, full_name text, student_code text,
         dob date, gender text, guardian_name text, guardian_phone text,
         level text in ('foundation','level_1','level_2','level_3','bridge'),
         enrolled_on date, active bool)
class_sessions(id uuid, center_id uuid, conducted_by uuid -> profiles.id,
               session_date date, subject text, curriculum_unit_id uuid,
               faces_detected int, auto_matched int)
attendance(id uuid, session_id uuid -> class_sessions.id, student_id uuid -> students.id,
           status text in ('present','absent','late'), method text in ('face','manual'),
           confidence real, overridden bool)
volunteer_checkins(id uuid, volunteer_id uuid -> profiles.id, center_id uuid,
                   check_in_at timestamptz, check_out_at timestamptz,
                   distance_m float8, location_verified bool, hours numeric)
curriculum_units(id uuid, title text, subject text, level text, duration_min int, sequence_no int)
center_curriculum(id uuid, center_id uuid, unit_id uuid, scheduled_for date,
                  status text in ('scheduled','delivered','skipped'), delivered_on date)
assessments(id uuid, title text, subject text, level text, center_id uuid,
            ai_generated bool, total_marks int)
assessment_results(id uuid, assessment_id uuid, student_id uuid, score numeric,
                   max_score numeric, percentage numeric, taken_on date, graded_by_ai bool)
certificates(id uuid, volunteer_id uuid, cert_type text, serial text, hours numeric, issued_on date)

Convenience views, which are usually the shortest route to an answer:
v_attendance_daily(session_date, center_id, center_name, zone_id, marked, present, attendance_rate)
v_center_stats(center_id, center_name, code, zone_id, zone_name, lat, lng, active, students,
               volunteers, sessions_30d, attendance_30d, attendance_prev_30d, avg_score)
v_student_progress(student_id, full_name, student_code, level, center_id, center_name, zone_id,
                   attendance_rate, avg_score, assessments_taken)
v_volunteer_stats(volunteer_id, full_name, email, role, center_id, center_name, zone_id,
                  joined_on, total_hours, shifts, verified_shifts, last_seen, sessions_led)

Notes:
- "attendance rate" means present-or-late divided by all marked records, as a percentage.
- Today is CURRENT_DATE. "This month" means date_trunc('month', current_date).
- Absent records exist as rows with status='absent'; do not assume missing rows mean absent.
`.trim();

/* ------------------------------------------------------------- SQL writing */

export interface SqlPlan {
  sql: string;
  intent: string;
  /** True when the question cannot be answered from this schema. */
  refused: boolean;
}

export async function writeSql(question: string): Promise<SqlPlan> {
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: question,
    config: {
      systemInstruction: `You translate questions from staff at an Indian education NGO into a single read-only Postgres query.

${SCHEMA_PROMPT}

Rules:
- Emit exactly ONE statement, starting with SELECT or WITH. Never a semicolon, never DDL or DML.
- Never reference auth, storage, pg_catalog or information_schema.
- Always alias aggregates to readable snake_case names — they become chart labels and column headers.
- Prefer the views when they answer the question directly.
- Round percentages to one decimal place.
- Add a sensible LIMIT (typically 20) for "top"/"worst"/"which" questions.
- If the schema cannot answer the question, set refused true and explain why in intent.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sql: { type: Type.STRING, description: "The single SELECT statement, or empty if refused." },
          intent: { type: Type.STRING, description: "One plain sentence describing what the query measures." },
          refused: { type: Type.BOOLEAN },
        },
        required: ["sql", "intent", "refused"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as Partial<SqlPlan>;
  return {
    sql: parsed.sql ?? "",
    intent: parsed.intent ?? "",
    refused: Boolean(parsed.refused),
  };
}

/* ------------------------------------------------------- answer and chart */

export interface Interpretation {
  answer: string;
  chart: ChartSpec;
}

export async function interpretResult(
  question: string,
  sql: string,
  rows: Record<string, unknown>[],
): Promise<Interpretation> {
  // Send a sample, not the whole result — the answer is about the shape.
  const sample = rows.slice(0, 40);

  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: `Question: ${question}

SQL that was run:
${sql}

Rows returned (${rows.length} total, first ${sample.length} shown):
${JSON.stringify(sample, null, 1)}`,
    config: {
      systemInstruction: `You explain query results to staff at an education NGO who do not read SQL.

Write two to four sentences in plain British English. Lead with the direct answer, then the one
detail that matters most — a name, a number, a change. Never invent a figure that is not in the
rows. If the rows are empty, say so plainly and suggest what might be asked instead.

Then choose how to draw it:
- "bar" for comparing named things, "line" or "area" for anything over time, "pie" only for parts
  of one whole with at most six slices, "none" when a single number or a plain list says it better.
- x must be a column name from the rows; y must be one or more numeric column names.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          chart: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["bar", "line", "area", "pie", "none"] },
              x: { type: Type.STRING },
              y: { type: Type.ARRAY, items: { type: Type.STRING } },
              title: { type: Type.STRING },
            },
            required: ["type", "x", "y"],
          },
        },
        required: ["answer", "chart"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as Partial<Interpretation>;
  return {
    answer: parsed.answer ?? "No interpretation was returned.",
    chart: parsed.chart ?? { type: "none", x: "", y: [] },
  };
}

/* --------------------------------------------------------- assessment gen */

export interface GeneratedPaper {
  title: string;
  questions: Question[];
  answer_key: AnswerKeyEntry[];
  total_marks: number;
}

export async function generatePaper(opts: {
  subject: string;
  level: LearningLevel;
  count: number;
  language: "English" | "Hindi";
  focus?: string;
}): Promise<GeneratedPaper> {
  const levelDescription: Record<LearningLevel, string> = {
    foundation: "5-7 year olds just starting; recognising letters, numbers to 20, simple shapes",
    level_1: "7-9 year olds; reading simple words, addition and subtraction within 100",
    level_2: "9-11 year olds; short sentences, multiplication, division, simple fractions",
    level_3: "11-13 year olds; paragraphs, decimals, percentages, basic geometry",
    bridge: "children preparing to join formal school; consolidating everything above",
  };

  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: `Write a ${opts.count}-question ${opts.subject} assessment in ${opts.language} for: ${levelDescription[opts.level]}.${opts.focus ? `\nFocus on: ${opts.focus}` : ""}`,
    config: {
      systemInstruction: `You write short assessments for children at UPAY's Footpathshala street-education centres in India.

These children study on footpaths, often after a day of work, with interrupted schooling. Write
questions that are answerable on paper with a pencil and no calculator.

- Use Indian names, rupees, and everyday objects children actually see — autos, chai, kites, mangoes.
- Never assume a home computer, a garden, a car, or a foreign context.
- Keep language at or below the stated level. Short sentences.
- Make roughly two thirds multiple choice (4 options each, worth 1 mark) and the rest short answer
  (worth 2 marks) — multiple choice is far more reliable to read back from a photographed sheet.
- Every question needs an unambiguous correct answer. For MCQs the key is the option letter (A-D).
- For short answers, list acceptable variations in "accept", including common spellings.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                n: { type: Type.INTEGER },
                type: { type: Type.STRING, enum: ["mcq", "short", "numeric"] },
                prompt: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                marks: { type: Type.INTEGER },
              },
              required: ["n", "type", "prompt", "marks"],
            },
          },
          answer_key: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                n: { type: Type.INTEGER },
                answer: { type: Type.STRING },
                accept: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["n", "answer"],
            },
          },
        },
        required: ["title", "questions", "answer_key"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as Partial<GeneratedPaper>;
  const questions = parsed.questions ?? [];
  return {
    title: parsed.title ?? `${opts.subject} assessment`,
    questions,
    answer_key: parsed.answer_key ?? [],
    total_marks: questions.reduce((s, q) => s + (q.marks ?? 0), 0),
  };
}

/* ------------------------------------------------------------- OCR grading */

export interface ReadAnswer {
  n: number;
  read: string;
  legible: boolean;
}

export interface SheetReading {
  student_hint: string | null;
  answers: ReadAnswer[];
  notes: string | null;
}

/**
 * Reads a photographed answer sheet. Multimodal vision replaces Tesseract here:
 * it is markedly better on children's handwriting and removes a native binary
 * from the deployment.
 */
export async function readAnswerSheet(
  imageBase64: string,
  mimeType: string,
  questions: Question[],
): Promise<SheetReading> {
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          {
            text: `Read this completed answer sheet. The paper had these questions:\n${questions
              .map((q) => `${q.n}. [${q.type}] ${q.prompt}${q.options ? ` (options: ${q.options.join(", ")})` : ""}`)
              .join("\n")}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: `You transcribe handwritten answer sheets from children. You do not grade them.

- Report exactly what is written, not what you think was meant. Do not silently correct spelling.
- For multiple choice, report the chosen option letter (A, B, C or D). If the child circled the
  option text instead of a letter, report the matching letter.
- If an answer is blank, report an empty string with legible false.
- If handwriting is genuinely unreadable, set legible false rather than guessing — a volunteer will
  check it, and a confident wrong reading is worse than an admitted gap.
- If a name or roll number is written on the sheet, report it in student_hint.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          student_hint: { type: Type.STRING },
          answers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                n: { type: Type.INTEGER },
                read: { type: Type.STRING },
                legible: { type: Type.BOOLEAN },
              },
              required: ["n", "read", "legible"],
            },
          },
          notes: { type: Type.STRING },
        },
        required: ["answers"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as Partial<SheetReading>;
  return {
    student_hint: parsed.student_hint || null,
    answers: parsed.answers ?? [],
    notes: parsed.notes || null,
  };
}

/** One or two sentences of encouragement and one concrete next step. */
export async function writeFeedback(opts: {
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  wrongPrompts: string[];
}): Promise<string> {
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: `${opts.studentName} scored ${opts.score} out of ${opts.maxScore} in ${opts.subject}.
Questions answered incorrectly:
${opts.wrongPrompts.length ? opts.wrongPrompts.map((p) => `- ${p}`).join("\n") : "- none"}`,
    config: {
      systemInstruction: `Write two sentences a volunteer teacher can read aloud to a child at a
Footpathshala centre. Name one specific thing to practise next, drawn from what they got wrong.
Warm and concrete, never patronising, never generic praise. Plain English.`,
    },
  });
  return response.text?.trim() ?? "";
}
