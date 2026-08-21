"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { generatePaper, readAnswerSheet, writeFeedback, geminiAvailable } from "@/lib/gemini";
import { gradeSheet, retotal } from "@/lib/grading";
import type { AnswerKeyEntry, GradedAnswer, LearningLevel, Question } from "@/lib/types";

const LEVELS = ["foundation", "level_1", "level_2", "level_3", "bridge"] as const;

const generateSchema = z.object({
  subject: z.string().min(2).max(60),
  level: z.enum(LEVELS),
  count: z.number().int().min(3).max(15),
  language: z.enum(["English", "Hindi"]),
  focus: z.string().max(200).optional(),
  centerId: z.string().uuid().nullable().optional(),
});

export async function createAssessment(input: z.infer<typeof generateSchema>) {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  if (!geminiAvailable()) {
    return { ok: false as const, error: "GEMINI_API_KEY is not configured, so papers cannot be generated." };
  }

  const { profile, supabase } = await requireProfile();

  let paper;
  try {
    paper = await generatePaper(parsed.data);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "The paper could not be generated.",
    };
  }

  if (!paper.questions.length) {
    return { ok: false as const, error: "The model returned no questions. Try again." };
  }

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      title: paper.title,
      subject: parsed.data.subject,
      level: parsed.data.level,
      center_id: parsed.data.centerId ?? profile.center_id,
      created_by: profile.id,
      ai_generated: true,
      total_marks: paper.total_marks,
      questions: paper.questions,
      answer_key: paper.answer_key,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/assessments");
  return { ok: true as const, id: data.id as string, paper };
}

export interface SheetReview {
  ok: boolean;
  error?: string;
  answers?: GradedAnswer[];
  score?: number;
  maxScore?: number;
  illegible?: number[];
  studentHint?: string | null;
  notes?: string | null;
}

/**
 * Reads and scores a photographed sheet. Nothing is written to a child's
 * record here — the result goes back to the volunteer for confirmation first.
 */
export async function reviewSheet(
  assessmentId: string,
  imageBase64: string,
  mimeType: string,
): Promise<SheetReview> {
  if (!geminiAvailable()) {
    return { ok: false, error: "GEMINI_API_KEY is not configured, so sheets cannot be read." };
  }
  if (imageBase64.length > 7_000_000) {
    return { ok: false, error: "That image is too large. Retake it at a lower resolution." };
  }

  const { supabase } = await requireProfile();
  const { data: assessment } = await supabase
    .from("assessments")
    .select("questions, answer_key")
    .eq("id", assessmentId)
    .single();

  if (!assessment) return { ok: false, error: "That assessment no longer exists." };

  const questions = assessment.questions as Question[];
  const answerKey = assessment.answer_key as AnswerKeyEntry[];

  let reading;
  try {
    reading = await readAnswerSheet(imageBase64, mimeType, questions);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The sheet could not be read." };
  }

  const graded = gradeSheet(questions, answerKey, reading.answers);

  return {
    ok: true,
    answers: graded.answers,
    score: graded.score,
    maxScore: graded.maxScore,
    illegible: graded.illegible,
    studentHint: reading.student_hint,
    notes: reading.notes,
  };
}

const saveSchema = z.object({
  assessmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  answers: z.array(
    z.object({
      n: z.number().int(),
      read: z.string(),
      expected: z.string(),
      correct: z.boolean(),
      marks: z.number(),
      awarded: z.number(),
    }),
  ),
  gradedByAi: z.boolean(),
});

export async function saveResult(input: z.infer<typeof saveSchema>) {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That result is not valid." };

  const { profile, supabase } = await requireProfile();
  const { assessmentId, studentId, answers, gradedByAi } = parsed.data;

  // Recompute from the confirmed rows. The volunteer's corrections decide the
  // score, not whatever total the model produced earlier.
  const { score, maxScore } = retotal(answers as GradedAnswer[]);

  const [{ data: student }, { data: assessment }] = await Promise.all([
    supabase.from("students").select("full_name").eq("id", studentId).single(),
    supabase.from("assessments").select("subject, questions").eq("id", assessmentId).single(),
  ]);

  let feedback = "";
  if (geminiAvailable() && student && assessment) {
    const questions = assessment.questions as Question[];
    const wrong = answers
      .filter((a) => !a.correct)
      .map((a) => questions.find((q) => q.n === a.n)?.prompt)
      .filter((p): p is string => Boolean(p));
    try {
      feedback = await writeFeedback({
        studentName: student.full_name,
        subject: assessment.subject,
        score,
        maxScore,
        wrongPrompts: wrong,
      });
    } catch {
      // Feedback is a nicety; never block saving a real score on it.
      feedback = "";
    }
  }

  const { error } = await supabase.from("assessment_results").upsert(
    {
      assessment_id: assessmentId,
      student_id: studentId,
      score,
      max_score: maxScore,
      answers,
      ai_feedback: feedback || null,
      graded_by_ai: gradedByAi,
      verified_by: profile.id,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,student_id" },
  );

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/assessments");
  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/students");
  return { ok: true as const, score, maxScore, feedback };
}

export async function deleteAssessment(id: string) {
  const { supabase } = await requireProfile();
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/assessments");
  return { ok: true as const };
}

export type { LearningLevel };
