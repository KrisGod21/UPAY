"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { reviewSheet, saveResult } from "../actions";
import { retotal } from "@/lib/grading";
import type { GradedAnswer } from "@/lib/types";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

interface RosterStudent {
  id: string;
  full_name: string;
  student_code: string;
}

/** Reads a File as a bare base64 payload, without the data-URL prefix. */
function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve({ data: result.split(",")[1] ?? "", mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

export function SheetGrader({
  assessmentId,
  students,
}: {
  assessmentId: string;
  students: RosterStudent[];
}) {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<GradedAnswer[] | null>(null);
  const [illegible, setIllegible] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ score: number; maxScore: number; feedback: string } | null>(null);
  const [edited, setEdited] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const { data, mimeType } = await fileToBase64(file);
      const result = await reviewSheet(assessmentId, data, mimeType);
      if (!result.ok) {
        setError(result.error ?? "The sheet could not be read.");
        return;
      }
      setAnswers(result.answers ?? []);
      setIllegible(result.illegible ?? []);
      setHint(result.studentHint ?? null);
      setEdited(false);

      // If the sheet carries a name, offer the matching child rather than
      // making the volunteer hunt for them in a list of twenty.
      if (result.studentHint) {
        const needle = result.studentHint.toLowerCase();
        const match = students.find(
          (s) =>
            s.full_name.toLowerCase().includes(needle) ||
            needle.includes(s.full_name.toLowerCase().split(" ")[0]) ||
            s.student_code.toLowerCase() === needle,
        );
        if (match) setStudentId(match.id);
      }
    } catch {
      setError("Something went wrong reading that sheet.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(n: number) {
    setAnswers((prev) =>
      prev
        ? prev.map((a) => (a.n === n ? { ...a, correct: !a.correct, awarded: !a.correct ? a.marks : 0 } : a))
        : prev,
    );
    setEdited(true);
  }

  async function save() {
    if (!answers || !studentId) return;
    setSaving(true);
    setError(null);
    const result = await saveResult({
      assessmentId,
      studentId,
      answers,
      // A sheet the volunteer corrected is no longer purely machine-graded.
      gradedByAi: !edited,
    });
    if (!result.ok) setError(result.error);
    else {
      setSaved({ score: result.score, maxScore: result.maxScore, feedback: result.feedback });
      router.refresh();
    }
    setSaving(false);
  }

  const totals = answers ? retotal(answers) : null;
  const pct = totals && totals.maxScore ? Math.round((totals.score / totals.maxScore) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="size-4" /> Grade a photographed sheet
        </CardTitle>
        <p className="text-xs text-muted">
          The model reports what is written; it does not decide the score on its own. Nothing reaches
          a child&rsquo;s record until you confirm it below.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!answers ? (
          <>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-4 py-10 text-center transition-colors hover:border-primary hover:bg-primary-soft",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <Camera className="size-6 text-primary" />
              <span className="text-sm font-semibold">Photograph the answer sheet</span>
              <span className="text-xs text-muted">
                Lay it flat, fill the frame, avoid shadow across the page.
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>

            {busy ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> Reading the handwriting…
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-card bg-mint px-4 py-3 text-mint-ink">
                <p className="tnum text-2xl font-extrabold leading-none">
                  {totals!.score}
                  <span className="text-base font-bold opacity-70">/{totals!.maxScore}</span>
                </p>
                <p className="mt-1 text-xs font-semibold opacity-80">{pct}%</p>
              </div>

              <div className="min-w-52 flex-1">
                <Field label="Which child is this?">
                  <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Choose a child…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} · {s.student_code}
                      </option>
                    ))}
                  </Select>
                </Field>
                {hint ? (
                  <p className="mt-1 px-1 text-xs text-muted">
                    The sheet appears to say &ldquo;{hint}&rdquo;.
                  </p>
                ) : null}
              </div>
            </div>

            {illegible.length ? (
              <p className="flex items-start gap-2 rounded-base bg-warning-soft px-3 py-2 text-sm text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Question{illegible.length > 1 ? "s" : ""} {illegible.join(", ")} could not be read
                confidently. Check {illegible.length > 1 ? "them" : "it"} against the paper before
                saving.
              </p>
            ) : null}

            <ul className="divide-y divide-border">
              {answers.map((a) => {
                const unreadable = illegible.includes(a.n);
                return (
                  <li key={a.n} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold">
                      {a.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-semibold">{a.read || "— blank —"}</span>
                        {!a.correct && a.expected ? (
                          <span className="ml-2 text-muted">expected {a.expected}</span>
                        ) : null}
                      </p>
                      {unreadable ? (
                        <p className="text-xs text-warning">handwriting unclear</p>
                      ) : null}
                    </div>
                    <Badge tone="neutral" className="shrink-0">
                      {a.marks}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => toggle(a.n)}
                      aria-pressed={a.correct}
                      aria-label={`Mark question ${a.n} ${a.correct ? "incorrect" : "correct"}`}
                      className={cn(
                        "press grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                        a.correct ? "bg-mint text-mint-ink" : "bg-surface-2 text-muted",
                      )}
                    >
                      {a.correct ? <Check className="size-4" /> : <X className="size-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {error ? (
              <p className="flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            ) : null}

            {saved ? (
              <div className="rounded-card bg-mint p-4 text-mint-ink">
                <p className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="size-4" /> Saved — {saved.score}/{saved.maxScore}
                </p>
                {saved.feedback ? <p className="mt-2 text-sm opacity-90">{saved.feedback}</p> : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving || !studentId || Boolean(saved)}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                {saved ? "Saved" : "Confirm and save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAnswers(null);
                  setSaved(null);
                  setStudentId("");
                  setHint(null);
                }}
              >
                <RefreshCw /> Next sheet
              </Button>
            </div>

            {!studentId ? (
              <p className="text-xs text-muted">Choose a child before saving.</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
