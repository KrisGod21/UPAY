"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarPlus, Check, Loader2, Plus, TriangleAlert, X } from "lucide-react";
import { createUnit, scheduleUnit, markDelivered } from "./actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  IconButton,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { LEVEL_LABELS, formatDate, cn } from "@/lib/utils";

const SUBJECTS = ["Literacy", "Numeracy", "Environmental Studies", "Life Skills", "English", "Art & Expression"];

export interface UnitRow {
  id: string;
  title: string;
  subject: string;
  level: string;
  description: string | null;
  duration_min: number;
  scheduled: number;
  delivered: number;
}

export interface ScheduleRow {
  id: string;
  scheduled_for: string;
  status: "scheduled" | "delivered" | "skipped";
  center_name: string;
  unit_title: string;
  unit_subject: string;
}

const LEVEL_TONE: Record<string, string> = {
  foundation: "bg-mint text-mint-ink",
  level_1: "bg-sky text-sky-ink",
  level_2: "bg-lilac text-lilac-ink",
  level_3: "bg-butter text-butter-ink",
  bridge: "bg-peach text-peach-ink",
};

export function CurriculumManager({
  units,
  schedule,
  centers,
  canEdit,
}: {
  units: UnitRow[];
  schedule: ScheduleRow[];
  centers: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"units" | "schedule">("units");
  const [showNew, setShowNew] = useState(false);
  const [scheduling, setScheduling] = useState<UnitRow | null>(null);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-surface-2 p-1">
          {(["units", "schedule"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={cn(
                "press rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                tab === key ? "bg-foreground text-background" : "text-muted hover:text-foreground",
              )}
            >
              {key === "units" ? "Lesson units" : "Scheduled at centres"}
            </button>
          ))}
        </div>

        {canEdit ? (
          <Button className="ml-auto" onClick={() => setShowNew((v) => !v)}>
            <Plus /> New unit
          </Button>
        ) : null}
      </div>

      {showNew ? <NewUnitForm onDone={() => { setShowNew(false); router.refresh(); }} /> : null}

      {scheduling ? (
        <ScheduleForm
          unit={scheduling}
          centers={centers}
          onDone={() => {
            setScheduling(null);
            router.refresh();
          }}
        />
      ) : null}

      {tab === "units" ? (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => (
            <article key={u.id} className={cn("lift flex h-full flex-col rounded-card p-5", LEVEL_TONE[u.level] ?? "bg-surface")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">{u.subject}</p>
                <span className="grid size-7 place-items-center rounded-full bg-white/60 dark:bg-white/10">
                  <BookOpen className="size-3.5" />
                </span>
              </div>

              <h3 className="mt-1.5 text-base font-bold leading-snug">{u.title}</h3>
              {u.description ? (
                <p className="mt-1.5 line-clamp-2 text-sm opacity-80">{u.description}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-white/60 px-2.5 py-1 font-semibold dark:bg-white/10">
                  {LEVEL_LABELS[u.level] ?? u.level}
                </span>
                <span className="rounded-full bg-white/60 px-2.5 py-1 font-semibold dark:bg-white/10">
                  {u.duration_min} min
                </span>
              </div>

              <div className="mt-auto flex items-end justify-between gap-2 pt-4 text-xs">
                <span className="opacity-80">
                  {u.scheduled ? `${u.delivered}/${u.scheduled} delivered` : "not scheduled yet"}
                </span>
                {canEdit ? (
                  <button
                    onClick={() => setScheduling(u)}
                    className="press inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 font-bold dark:bg-white/10"
                  >
                    <CalendarPlus className="size-3.5" /> Schedule
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {schedule.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-52 flex-1">
                    <p className="text-sm font-semibold">{s.unit_title}</p>
                    <p className="text-xs text-muted">
                      {s.unit_subject} · {s.center_name} · {formatDate(s.scheduled_for)}
                    </p>
                  </div>
                  <Badge
                    tone={s.status === "delivered" ? "mint" : s.status === "skipped" ? "danger" : "lilac"}
                  >
                    {s.status === "delivered" ? "Delivered 👏" : s.status === "skipped" ? "Missed 🌧️" : "Coming up ⏳"}
                  </Badge>
                  {canEdit ? (
                    <DeliveredToggle id={s.id} delivered={s.status === "delivered"} />
                  ) : null}
                </li>
              ))}
              {!schedule.length ? (
                <li className="p-8 text-center text-sm text-muted">Nothing scheduled yet.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DeliveredToggle({ id, delivered }: { id: string; delivered: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <IconButton
      tone={delivered ? "mint" : "surface"}
      disabled={busy}
      aria-label={delivered ? "Mark as not delivered" : "Mark as delivered"}
      onClick={async () => {
        setBusy(true);
        await markDelivered(id, !delivered);
        router.refresh();
        setBusy(false);
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : delivered ? <Check /> : <X />}
    </IconButton>
  );
}

function NewUnitForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [level, setLevel] = useState("foundation");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="animate-in mb-5">
      <CardHeader>
        <CardTitle>New lesson unit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Numeracy — Counting to 50" />
          </Field>
          <Field label="Subject">
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Level">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" min={10} max={180} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </Field>
        </div>

        <Field label="What happens in this session?">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Warm-up circle, core activity, pair practice, closing recap."
          />
        </Field>

        {error ? (
          <p className="flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            disabled={busy || title.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const result = await createUnit({
                title: title.trim(),
                subject,
                level: level as never,
                description: description.trim() || undefined,
                duration_min: duration,
              });
              setBusy(false);
              if (!result.ok) setError(result.error);
              else onDone();
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Save unit
          </Button>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleForm({
  unit,
  centers,
  onDone,
}: {
  unit: UnitRow;
  centers: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="animate-in mb-5">
      <CardHeader>
        <CardTitle>Schedule &ldquo;{unit.title}&rdquo;</CardTitle>
        <p className="text-xs text-muted">Pick the centres that should teach this, and when.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-56" />
        </Field>

        <div>
          <p className="mb-2 px-1 text-sm font-semibold">Centres</p>
          <div className="flex flex-wrap gap-2">
            {centers.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelected((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                  }
                  aria-pressed={on}
                  className={cn(
                    "press rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    on ? "bg-foreground text-background" : "bg-surface-2 text-muted hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSelected(selected.length === centers.length ? [] : centers.map((c) => c.id))}
            className="mt-2 px-1 text-xs font-semibold text-primary hover:underline"
          >
            {selected.length === centers.length ? "Clear all" : "Select every centre"}
          </button>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            disabled={busy || !selected.length}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const result = await scheduleUnit({ unitId: unit.id, centerIds: selected, scheduledFor: date });
              setBusy(false);
              if (!result.ok) setError(result.error);
              else onDone();
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
            Schedule at {selected.length || "no"} centre{selected.length === 1 ? "" : "s"}
          </Button>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
