import { describe, it, expect } from "vitest";
import {
  normalise,
  normaliseOption,
  parseNumeric,
  isCorrect,
  gradeSheet,
  retotal,
} from "@/lib/grading";
import type { Question, AnswerKeyEntry } from "@/lib/types";

const questions: Question[] = [
  { n: 1, type: "mcq", prompt: "2 x 3 = ?", options: ["4", "5", "6", "7"], marks: 1 },
  { n: 2, type: "mcq", prompt: "Opposite of hot", options: ["cold", "warm", "big", "wet"], marks: 1 },
  { n: 3, type: "short", prompt: "Name a fruit", marks: 2 },
  { n: 4, type: "numeric", prompt: "Rupees left from 50 after spending 20", marks: 2 },
];

const key: AnswerKeyEntry[] = [
  { n: 1, answer: "C" },
  { n: 2, answer: "A" },
  { n: 3, answer: "mango", accept: ["aam", "banana", "kela"] },
  { n: 4, answer: "30" },
];

describe("normaliseOption — children do not write neatly", () => {
  it("reads a bare letter", () => expect(normaliseOption("c")).toBe("C"));
  it("reads a letter with a bracket", () => expect(normaliseOption("(C)")).toBe("C"));
  it("reads a letter with a full stop", () => expect(normaliseOption("C.")).toBe("C"));
  it("accepts a digit used in place of a letter", () => expect(normaliseOption("3")).toBe("C"));
  it("finds the letter inside a phrase", () => expect(normaliseOption("option b")).toBe("B"));
  it("returns empty for a blank", () => expect(normaliseOption("   ")).toBe(""));
});

describe("parseNumeric", () => {
  it("strips a rupee sign", () => expect(parseNumeric("₹30")).toBe(30));
  it("strips commas", () => expect(parseNumeric("1,200")).toBe(1200));
  it("finds a number inside words", () => expect(parseNumeric("30 rupees")).toBe(30));
  it("handles decimals", () => expect(parseNumeric("2.5")).toBe(2.5));
  it("returns null when there is no number", () => expect(parseNumeric("thirty")).toBeNull());
});

describe("isCorrect", () => {
  it("marks the right MCQ letter correct", () => {
    expect(isCorrect(questions[0], key[0], "C")).toBe(true);
  });
  it("marks a wrong MCQ letter incorrect", () => {
    expect(isCorrect(questions[0], key[0], "B")).toBe(false);
  });
  it("accepts an alternative short answer from the accept list", () => {
    expect(isCorrect(questions[2], key[2], "Kela")).toBe(true);
  });
  it("ignores punctuation and case in short answers", () => {
    expect(isCorrect(questions[2], key[2], "  Mango. ")).toBe(true);
  });
  it("rejects a short answer that is not on the list", () => {
    expect(isCorrect(questions[2], key[2], "potato")).toBe(false);
  });
  it("accepts a numeric answer written with a rupee sign", () => {
    expect(isCorrect(questions[3], key[3], "₹30")).toBe(true);
  });
  it("rejects a genuinely different number", () => {
    expect(isCorrect(questions[3], key[3], "31")).toBe(false);
  });
  it("treats a blank as incorrect rather than throwing", () => {
    expect(isCorrect(questions[0], key[0], "")).toBe(false);
  });
  it("is incorrect when the key is missing rather than crashing", () => {
    expect(isCorrect(questions[0], undefined, "C")).toBe(false);
  });
});

describe("gradeSheet", () => {
  it("scores a perfect sheet", () => {
    const result = gradeSheet(questions, key, [
      { n: 1, read: "C", legible: true },
      { n: 2, read: "A", legible: true },
      { n: 3, read: "mango", legible: true },
      { n: 4, read: "30", legible: true },
    ]);
    expect(result.score).toBe(6);
    expect(result.maxScore).toBe(6);
    expect(result.illegible).toEqual([]);
  });

  it("awards partial marks and reports the max correctly", () => {
    const result = gradeSheet(questions, key, [
      { n: 1, read: "C", legible: true },
      { n: 2, read: "D", legible: true },
      { n: 3, read: "kela", legible: true },
      { n: 4, read: "25", legible: true },
    ]);
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(6);
  });

  it("flags an illegible answer instead of silently marking it wrong", () => {
    const result = gradeSheet(questions, key, [
      { n: 1, read: "", legible: false },
      { n: 2, read: "A", legible: true },
      { n: 3, read: "mango", legible: true },
      { n: 4, read: "30", legible: true },
    ]);
    expect(result.illegible).toEqual([1]);
    expect(result.answers[0].correct).toBe(false);
    expect(result.score).toBe(5);
  });

  it("handles a sheet where the reader missed questions entirely", () => {
    const result = gradeSheet(questions, key, [{ n: 1, read: "C", legible: true }]);
    expect(result.answers).toHaveLength(4);
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(6);
  });

  it("does not credit a question whose answer was left blank", () => {
    const result = gradeSheet(questions, key, [
      { n: 1, read: "", legible: true },
      { n: 2, read: "", legible: true },
      { n: 3, read: "", legible: true },
      { n: 4, read: "", legible: true },
    ]);
    expect(result.score).toBe(0);
  });
});

describe("retotal — after a volunteer corrects the grading", () => {
  it("recomputes from the corrected flags", () => {
    const graded = gradeSheet(questions, key, [
      { n: 1, read: "C", legible: true },
      { n: 2, read: "D", legible: true },
      { n: 3, read: "aam", legible: true },
      { n: 4, read: "30", legible: true },
    ]);
    expect(graded.score).toBe(5);

    // The volunteer looks at question 2 and decides the child was right.
    graded.answers[1].correct = true;
    expect(retotal(graded.answers)).toEqual({ score: 6, maxScore: 6 });
  });
});
