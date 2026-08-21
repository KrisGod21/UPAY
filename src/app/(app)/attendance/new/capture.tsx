"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Loader2,
  MapPin,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  WifiOff,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { detectFaces, fileToImage, getPosition, loadFaceApi, type DetectedFace } from "@/lib/face";
import { bestMatch, cn, haversineMeters, FACE_MATCH_THRESHOLD } from "@/lib/utils";
import { saveAttendance, enrollMany } from "../actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Select } from "@/components/ui";
import { useT } from "@/lib/i18n";

interface CenterOption {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  radius_m: number;
}

interface RosterStudent {
  id: string;
  full_name: string;
  student_code: string;
  level: string;
  face_descriptor: number[] | null;
}

type Mark = {
  status: "present" | "absent" | "late";
  method: "face" | "manual";
  confidence: number | null;
  overridden: boolean;
};

const SUBJECTS = ["Literacy", "Numeracy", "Environmental Studies", "Life Skills", "English", "Art & Expression"];
const QUEUE_KEY = "upay-attendance-queue";

export function AttendanceCapture({
  centers,
  defaultCenterId,
}: {
  centers: CenterOption[];
  defaultCenterId?: string | null;
}) {
  const router = useRouter();
  const t = useT();

  const [centerId, setCenterId] = useState(defaultCenterId ?? centers[0]?.id ?? "");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [marks, setMarks] = useState<Record<string, Mark>>({});

  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<"setup" | "working" | "review">("setup");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [queued, setQueued] = useState(false);

  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const center = centers.find((c) => c.id === centerId);

  /* --------------------------------------------------------------- roster */

  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    setRosterLoading(true);
    const supabase = createClient();
    supabase
      .from("students")
      .select("id, full_name, student_code, level, face_descriptor")
      .eq("center_id", centerId)
      .eq("active", true)
      .order("full_name")
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data ?? []) as RosterStudent[];
        setRoster(list);
        setMarks(
          Object.fromEntries(
            list.map((s) => [s.id, { status: "absent", method: "manual", confidence: null, overridden: false } as Mark]),
          ),
        );
        setRosterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [centerId]);

  /* ------------------------------------------------------------- location */

  useEffect(() => {
    getPosition().then(setPosition);
  }, []);

  // Warm the models while the volunteer is still choosing a subject, so the
  // first capture does not stall on a 12 MB download.
  useEffect(() => {
    loadFaceApi().catch(() => {});
  }, []);

  const distance =
    position && center?.lat != null && center?.lng != null
      ? haversineMeters(position.lat, position.lng, center.lat, center.lng)
      : null;
  const onSite = distance != null && distance <= (center?.radius_m ?? 300);

  /* ------------------------------------------------------------- capture */

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setPhase("working");
      try {
        setStatus("Reading the photograph…");
        const img = await fileToImage(file);
        imageRef.current = img;

        setStatus("Loading the recognition models…");
        await loadFaceApi();

        setStatus("Finding faces…");
        const detected = await detectFaces(img);

        if (!detected.length) {
          setError("No faces were found in that photograph. Try again with better light, or mark the register by hand.");
          setPhase("setup");
          return;
        }

        setStatus("Matching against the centre roster…");
        const enrolled = roster.filter((s) => s.face_descriptor?.length === 128);
        const next: Record<string, Mark> = Object.fromEntries(
          roster.map((s) => [s.id, { status: "absent", method: "manual", confidence: null, overridden: false } as Mark]),
        );

        // One student may only be claimed once — keep the closest match.
        const claimed = new Map<string, number>();
        for (const face of detected) {
          const match = bestMatch(face.descriptor, enrolled);
          if (!match) continue;
          const existing = claimed.get(match.entry.id);
          if (existing != null && existing <= match.distance) continue;
          claimed.set(match.entry.id, match.distance);
          next[match.entry.id] = {
            status: "present",
            method: "face",
            confidence: Number((1 - match.distance / FACE_MATCH_THRESHOLD).toFixed(2)),
            overridden: false,
          };
        }

        setFaces(detected);
        setMarks(next);
        setAssignments({});
        setPhase("review");
        setStatus("");
        drawBoxes(detected);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong while reading that photograph.");
        setPhase("setup");
      }
    },
    [roster],
  );

  function drawBoxes(detected: DetectedFace[]) {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    ctx.lineWidth = Math.max(2, img.width / 320);
    ctx.strokeStyle = "#1baf7a";
    for (const f of detected) {
      ctx.strokeRect(f.box.x, f.box.y, f.box.width, f.box.height);
    }
  }

  /* ---------------------------------------------------------------- marks */

  const setStatusFor = (studentId: string, status: Mark["status"]) =>
    setMarks((m) => ({
      ...m,
      [studentId]: { ...m[studentId], status, overridden: true, method: m[studentId]?.method ?? "manual" },
    }));

  const assignFace = (faceIndex: number, studentId: string) => {
    setAssignments((a) => {
      const next = { ...a };
      if (!studentId) delete next[faceIndex];
      else next[faceIndex] = studentId;
      return next;
    });
    if (studentId) {
      setMarks((m) => ({
        ...m,
        [studentId]: { status: "present", method: "face", confidence: null, overridden: true },
      }));
    }
  };

  const recognised = Object.values(marks).filter((m) => m.method === "face" && m.status !== "absent").length;
  const presentCount = Object.values(marks).filter((m) => m.status !== "absent").length;
  const unassignedFaces = faces.filter((f) => {
    if (assignments[f.index]) return false;
    const enrolled = roster.filter((s) => s.face_descriptor?.length === 128);
    return !bestMatch(f.descriptor, enrolled);
  });

  /* --------------------------------------------------------------- submit */

  async function submit() {
    setSaving(true);
    setError(null);

    const payload = {
      centerId,
      sessionDate,
      subject,
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      facesDetected: faces.length,
      autoMatched: recognised,
      marks: roster.map((s) => ({
        studentId: s.id,
        status: marks[s.id]?.status ?? "absent",
        method: marks[s.id]?.method ?? "manual",
        confidence: marks[s.id]?.confidence ?? null,
        overridden: marks[s.id]?.overridden ?? false,
      })),
    };

    try {
      const enrolments = Object.entries(assignments).map(([faceIndex, studentId]) => ({
        studentId,
        descriptor: faces[Number(faceIndex)].descriptor,
      }));
      if (enrolments.length) await enrollMany(enrolments);

      const result = await saveAttendance(payload);
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.push("/attendance");
      router.refresh();
    } catch {
      // Offline, or the server is unreachable. Keep the register rather than
      // losing a class the volunteer has already reviewed.
      const queue = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]");
      queue.push({ payload, at: new Date().toISOString() });
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      setQueued(true);
      setSaving(false);
    }
  }

  /* ----------------------------------------------------------------- view */

  if (queued) {
    return (
      <Card className="p-8 text-center">
        <WifiOff className="mx-auto mb-3 size-8 text-warning" />
        <h2 className="text-lg font-semibold">Saved on this device</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          The network was unavailable, so this register is stored locally and will be sent the next
          time the app reaches the server. Nothing has been lost.
        </p>
        <Button className="mt-5" onClick={() => router.push("/attendance")}>
          Back to attendance
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* ------------------------------------------------------------ setup */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={t("label.centre")}>
              <Select value={centerId} onChange={(e) => setCenterId(e.target.value)} disabled={phase === "review"}>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </Field>
            </div>

            <div
              className={cn(
                "flex items-start gap-2 rounded-base px-3 py-2 text-xs",
                position == null
                  ? "bg-surface-2 text-muted"
                  : onSite
                    ? "bg-success-soft text-success"
                    : "bg-warning-soft text-warning",
              )}
            >
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {position == null
                  ? "Location unavailable — the session will be saved without a geo-tag."
                  : distance == null
                    ? "This centre has no coordinates on file yet."
                    : onSite
                      ? `On site — ${distance} m from the centre.`
                      : `${distance} m from the centre, outside its ${center?.radius_m ?? 300} m radius.`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanFace className="size-4" />
              Class photograph
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-base border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft",
                phase === "working" && "pointer-events-none opacity-60",
              )}
            >
              <Camera className="size-6 text-primary" />
              <span className="text-sm font-medium">{t("action.takePhoto")}</span>
              <span className="text-xs text-muted">
                One photo of the whole class. Tap to open the camera or choose a file.
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

            {phase === "working" ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" />
                {status}
              </p>
            ) : null}

            {error ? (
              <p className="flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            ) : null}

            <p className="flex items-start gap-2 rounded-base bg-accent-soft px-3 py-2 text-xs text-accent">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              Recognition runs on this device. The photograph is never uploaded and never stored —
              only the roster result is saved.
            </p>
          </CardContent>
        </Card>

        {phase === "review" ? (
          <Card>
            <CardContent className="p-5">
              <canvas ref={canvasRef} className="w-full rounded-base border border-border" />
              <p className="mt-2 text-xs text-muted">
                {faces.length} face{faces.length === 1 ? "" : "s"} detected · {recognised} matched
                automatically
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ----------------------------------------------------------- review */}
      <div className="space-y-4">
        {phase === "review" && unassignedFaces.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Who are these children?
              </CardTitle>
              <p className="text-xs text-muted">
                These faces did not match anyone enrolled. Naming one now marks them present and
                enrols their face, so the next class recognises them automatically.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {unassignedFaces.map((f) => (
                  <div key={f.index} className="rounded-base border border-border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.thumbnail}
                      alt={`Unmatched face ${f.index + 1}`}
                      className="mb-2 aspect-square w-full rounded-base object-cover"
                    />
                    <Select
                      value={assignments[f.index] ?? ""}
                      onChange={(e) => assignFace(f.index, e.target.value)}
                      className="text-xs"
                    >
                      <option value="">Skip this face</option>
                      {roster.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Register</CardTitle>
              <div className="flex items-center gap-2 text-xs">
                <Badge tone="success">{presentCount} present</Badge>
                <Badge tone="neutral">{roster.length - presentCount} absent</Badge>
                {phase === "review" ? <Badge tone="accent">{recognised} by face</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rosterLoading ? (
              <p className="flex items-center gap-2 py-8 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> Loading the roster…
              </p>
            ) : roster.length === 0 ? (
              <p className="py-8 text-sm text-muted">No active children are registered at this centre yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {roster.map((s) => {
                  const mark = marks[s.id];
                  const present = mark?.status !== "absent";
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.full_name}</p>
                        <p className="text-xs text-muted">
                          {s.student_code}
                          {mark?.method === "face" && mark.confidence != null ? (
                            <span className="ml-2 text-accent">
                              {t("label.recognised")} · {Math.round(mark.confidence * 100)}%
                            </span>
                          ) : null}
                          {mark?.overridden ? <span className="ml-2 text-warning">edited</span> : null}
                          {!s.face_descriptor ? <span className="ml-2 text-muted">not enrolled</span> : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setStatusFor(s.id, "present")}
                          aria-pressed={present}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border transition-colors",
                            present
                              ? "border-success bg-success-soft text-success"
                              : "border-border text-muted hover:text-foreground",
                          )}
                          aria-label={`Mark ${s.full_name} present`}
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFor(s.id, "absent")}
                          aria-pressed={!present}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border transition-colors",
                            !present
                              ? "border-danger bg-danger-soft text-danger"
                              : "border-border text-muted hover:text-foreground",
                          )}
                          aria-label={`Mark ${s.full_name} absent`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={saving || !roster.length}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {t("action.markAttendance")}
          </Button>
          {phase === "review" ? (
            <Button
              variant="outline"
              onClick={() => {
                setPhase("setup");
                setFaces([]);
                setAssignments({});
              }}
            >
              <RefreshCw /> Retake photo
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
