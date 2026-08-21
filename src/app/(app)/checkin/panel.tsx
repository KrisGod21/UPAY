"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { getPosition } from "@/lib/face";
import { haversineMeters, cn } from "@/lib/utils";
import { checkIn, checkOut } from "./actions";
import { Button, Card, CardContent, CardHeader, CardTitle, Field, Select } from "@/components/ui";
import { useT } from "@/lib/i18n";

interface CentreOption {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  radius_m: number;
}

export function CheckinPanel({
  centers,
  defaultCenterId,
  openShift,
}: {
  centers: CentreOption[];
  defaultCenterId?: string | null;
  openShift: { id: string; center_name: string; check_in_at: string } | null;
}) {
  const router = useRouter();
  const t = useT();

  const [centerId, setCenterId] = useState(defaultCenterId ?? centers[0]?.id ?? "");
  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    getPosition().then((p) => {
      setPosition(p);
      setLocating(false);
    });
  }, []);

  // Live shift timer, so a volunteer can see the clock is actually running.
  useEffect(() => {
    if (!openShift) return;
    const tick = () => {
      const ms = Date.now() - new Date(openShift.check_in_at).getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setElapsed(`${h}h ${String(m).padStart(2, "0")}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [openShift]);

  const center = centers.find((c) => c.id === centerId);
  const distance =
    position && center?.lat != null && center?.lng != null
      ? haversineMeters(position.lat, position.lng, center.lat, center.lng)
      : null;
  const onSite = distance != null && distance <= (center?.radius_m ?? 300);

  async function handleCheckIn() {
    setBusy(true);
    setError(null);
    const result = await checkIn({ centerId, lat: position?.lat ?? null, lng: position?.lng ?? null });
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusy(false);
  }

  async function handleCheckOut() {
    setBusy(true);
    setError(null);
    const result = await checkOut();
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusy(false);
  }

  if (openShift) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-success-soft text-success">
            <ShieldCheck className="size-6" />
          </span>
          <h2 className="text-lg font-semibold">Checked in at {openShift.center_name}</h2>
          <p className="mt-1 text-sm text-muted">
            Since{" "}
            {new Date(openShift.check_in_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {elapsed ? ` · ${elapsed} so far` : ""}
          </p>
          <Button className="mt-5" onClick={handleCheckOut} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
            {t("action.checkOut")}
          </Button>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a shift</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label={t("label.centre")}>
          <Select value={centerId} onChange={(e) => setCenterId(e.target.value)}>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div
          className={cn(
            "flex items-start gap-2 rounded-[--radius-base] px-3 py-2.5 text-sm",
            locating
              ? "bg-surface-2 text-muted"
              : position == null
                ? "bg-warning-soft text-warning"
                : onSite
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning",
          )}
        >
          {locating ? (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          ) : (
            <MapPin className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {locating
              ? "Finding your location…"
              : position == null
                ? "Location is unavailable. You can still check in, but the shift will not be geo-verified."
                : distance == null
                  ? "This centre has no coordinates recorded, so distance cannot be checked."
                  : onSite
                    ? `You are ${distance} m from ${center?.name} — within its ${center?.radius_m} m radius.`
                    : `You are ${distance} m away, outside the ${center?.radius_m} m radius. The shift will be logged as unverified.`}
          </span>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-[--radius-base] bg-danger-soft px-3 py-2 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <Button onClick={handleCheckIn} disabled={busy || !centerId} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <LogIn />}
          {t("action.checkIn")}
        </Button>

        <p className="text-xs text-muted">
          Distance is recalculated on the server from the coordinates your device reports. A shift
          outside the radius is still recorded — it is marked unverified, not rejected, because a
          class sometimes moves and the record should say what happened.
        </p>
      </CardContent>
    </Card>
  );
}
