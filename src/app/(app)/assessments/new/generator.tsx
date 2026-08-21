"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, TriangleAlert, Wand2 } from "lucide-react";
import { createAssessment } from "../actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/utils";
import type { Question } from "@/lib/types";

const SUBJECTS = ["Numeracy", "Literacy", "Environmental Studies", "Life Skills", "English", "Art & Expression"];

export function AssessmentGenerator({
  centers,
  defaultCenterId,
}: {
  centers: { id: string; name: string }[];
  defaultCenterId: string | null;
}) {
  const router = useRouter();

  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState<keyof typeof LEVEL_LABELS>("level_1");
  const [count, setCount] = useState(8);
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  const [focus, setFocus] = useState("");
  const [centerId, setCenterId] = useState(defaultCenterId ?? centers[0]?.id ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; title: string; questions: Question[] } | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const result = await createAssessment({
        subject,
        level: level as never,
        count,
        language,
        focus: focus.trim() || undefined,
        centerId: centerId || null,
      });
      if (!result.ok) setError(result.error);
      else setPreview({ id: result.id, title: result.paper.title, questions: result.paper.questions });
    } catch {
      setError("The paper could not be generated. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="size-4" /> Paper settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Subject">
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>

          <Field label="Learning level" hint="Questions are pitched at this level, not at a school grade.">
            <Select value={level} onChange={(e) => setLevel(e.target.value as never)}>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Questions">
              <Input
                type="number"
                min={3}
                max={15}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Field>
            <Field label="Language">
              <Select value={language} onChange={(e) => setLanguage(e.target.value as never)}>
                <option>English</option>
                <option>Hindi</option>
              </Select>
            </Field>
          </div>

          {centers.length ? (
            <Field label="Centre">
              <Select value={centerId} onChange={(e) => setCenterId(e.target.value)}>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Focus (optional)" hint="For example: two-digit addition, or reading a bus timetable.">
            <Textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              rows={2}
              placeholder="What should this paper concentrate on?"
            />
          </Field>

          {error ? (
            <p className="flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button onClick={generate} disabled={busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Writing the paper…" : "Generate paper"}
          </Button>

          <p className="text-xs text-muted">
            Papers are written for children who study on a footpath — Indian names, rupees, everyday
            objects, and nothing that assumes a computer or a garden at home.
          </p>
        </CardContent>
      </Card>

      <div>
        {preview ? (
          <Card className="animate-in">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{preview.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted">
                    {preview.questions.length} questions ·{" "}
                    {preview.questions.reduce((s, q) => s + q.marks, 0)} marks
                  </p>
                </div>
                <Button onClick={() => router.push(`/assessments/${preview.id}`)}>Open paper</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {preview.questions.map((q) => (
                  <li key={q.n} className="rounded-card bg-surface-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">
                        <span className="mr-2 text-muted">{q.n}.</span>
                        {q.prompt}
                      </p>
                      <Badge tone={q.type === "mcq" ? "sky" : "butter"}>
                        {q.marks} mark{q.marks === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    {q.options?.length ? (
                      <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                        {q.options.map((opt, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold">
                              {"ABCD"[i]}
                            </span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2.5 h-8 rounded-base border-2 border-dashed border-border" />
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-10 text-center">
            <span className="text-3xl" aria-hidden>
              📝
            </span>
            <p className="font-semibold">No paper yet</p>
            <p className="max-w-sm text-sm text-muted">
              Choose a subject and level, then generate. The paper and its answer key are saved
              together, so grading a photographed sheet has something to compare against.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
