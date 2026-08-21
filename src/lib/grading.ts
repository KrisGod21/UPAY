import type { AnswerKeyEntry, GradedAnswer, Question } from "@/lib/types";

/**
 * Scores a transcribed answer sheet against the key.
 *
 * Kept deliberately separate from the model that reads the handwriting. The
 * model's job is to report what is written; deciding whether that is correct is
 * ordinary comparison, and ordinary comparison can be tested.
 */

/** Lowercase, strip punctuation and collapse whitespace. */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:'"`()\[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pulls an option letter out of whatever the child actually wrote. */
export function normaliseOption(value: string): string {
  const cleaned = normalise(value);
  if (!cleaned) return "";
  const letter = cleaned.match(/\b([a-d])\b/);
  if (letter) return letter[1].toUpperCase();
  // "1" through "4" are sometimes used in place of A-D.
  const digit = cleaned.match(/\b([1-4])\b/);
  if (digit) return "ABCD"[Number(digit[1]) - 1];
  return cleaned.toUpperCase();
}

/** Parses a number, tolerating rupee signs, commas and stray units. */
export function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/[₹,\s]/g, "").match(/-?\d+(?:\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : null;
}

export function isCorrect(
  question: Question,
  key: AnswerKeyEntry | undefined,
  read: string,
): boolean {
  if (!key) return false;
  if (!read.trim()) return false;

  if (question.type === "mcq") {
    return normaliseOption(read) === normaliseOption(key.answer);
  }

  if (question.type === "numeric") {
    const got = parseNumeric(read);
    const want = parseNumeric(key.answer);
    if (got == null || want == null) return false;
    // Tolerate float noise without accepting a genuinely different number.
    return Math.abs(got - want) < 1e-9;
  }

  const got = normalise(read);
  const accepted = [key.answer, ...(key.accept ?? [])].map(normalise).filter(Boolean);
  return accepted.includes(got);
}

export interface GradeOutcome {
  answers: GradedAnswer[];
  score: number;
  maxScore: number;
  /** Questions the reader could not make out — these need a human. */
  illegible: number[];
}

export function gradeSheet(
  questions: Question[],
  answerKey: AnswerKeyEntry[],
  read: { n: number; read: string; legible: boolean }[],
): GradeOutcome {
  const keyByN = new Map(answerKey.map((k) => [k.n, k]));
  const readByN = new Map(read.map((r) => [r.n, r]));

  const answers: GradedAnswer[] = questions.map((q) => {
    const key = keyByN.get(q.n);
    const entry = readByN.get(q.n);
    const text = entry?.read ?? "";
    // An unreadable answer scores zero but is flagged, never silently marked wrong.
    const correct = entry?.legible === false ? false : isCorrect(q, key, text);
    return {
      n: q.n,
      read: text,
      expected: key?.answer ?? "",
      correct,
      marks: q.marks,
      awarded: correct ? q.marks : 0,
    };
  });

  return {
    answers,
    score: answers.reduce((s, a) => s + a.awarded, 0),
    maxScore: questions.reduce((s, q) => s + q.marks, 0),
    illegible: read.filter((r) => !r.legible).map((r) => r.n),
  };
}

/** Recomputes the total after a volunteer overrides individual rows. */
export function retotal(answers: GradedAnswer[]): { score: number; maxScore: number } {
  return {
    score: answers.reduce((s, a) => s + (a.correct ? a.marks : 0), 0),
    maxScore: answers.reduce((s, a) => s + a.marks, 0),
  };
}
