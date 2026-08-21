"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Check, Download, Loader2, TriangleAlert } from "lucide-react";
import { issueCertificate } from "./actions";
import { CERT_LABELS, assessEligibility } from "@/lib/certificates";
import type { CertificateType } from "@/lib/types";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Meter } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface IssuedCertificate {
  id: string;
  serial: string;
  cert_type: CertificateType;
  hours: number;
  sessions_count: number;
  issued_on: string;
  volunteer_name: string;
  center_name: string | null;
}

export interface CandidateRow {
  volunteer_id: string;
  full_name: string;
  center_name: string | null;
  total_hours: number;
  shifts: number;
  verified_shifts: number;
  sessions_led: number;
  joined_on: string | null;
  already_issued: boolean;
}

export function CertificateList({
  issued,
  candidates,
  canIssue,
}: {
  issued: IssuedCertificate[];
  candidates: CandidateRow[];
  canIssue: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="size-4" /> Issued certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issued.length ? (
            <div className="stagger grid gap-3 sm:grid-cols-2">
              {issued.map((c) => (
                <CertificateCard key={c.id} cert={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No certificates issued yet"
              description="Volunteers appear on the right as soon as their hours qualify."
              emoji="🏅"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approaching eligibility</CardTitle>
          <p className="text-xs text-muted">
            Hours alone are not enough — the outstanding-service award also requires that shifts were
            genuinely on site.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {candidates.length ? (
            candidates.map((c) => <CandidateCard key={c.volunteer_id} row={c} canIssue={canIssue} />)
          ) : (
            <p className="py-6 text-center text-sm text-muted">Nobody is close to a milestone yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CertificateCard({ cert }: { cert: IssuedCertificate }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      doc.setFillColor(247, 248, 246);
      doc.rect(0, 0, w, h, "F");

      doc.setDrawColor(217, 90, 30);
      doc.setLineWidth(6);
      doc.rect(28, 28, w - 56, h - 56);
      doc.setLineWidth(1);
      doc.setDrawColor(230, 231, 226);
      doc.rect(44, 44, w - 88, h - 88);

      doc.setTextColor(217, 90, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("UPAY  ·  FOOTPATHSHALA", w / 2, 104, { align: "center" });

      doc.setTextColor(18, 19, 15);
      doc.setFontSize(34);
      doc.text(CERT_LABELS[cert.cert_type], w / 2, 168, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(106, 109, 99);
      doc.text("This is presented to", w / 2, 214, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(40);
      doc.setTextColor(18, 19, 15);
      doc.text(cert.volunteer_name, w / 2, 268, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(106, 109, 99);
      const body = `in recognition of ${Math.round(cert.hours)} hours of service across ${cert.sessions_count} shifts${
        cert.center_name ? ` at ${cert.center_name}` : ""
      },`;
      doc.text(body, w / 2, 306, { align: "center" });
      doc.text(
        "teaching children who would otherwise have no classroom at all.",
        w / 2,
        328,
        { align: "center" },
      );

      doc.setDrawColor(18, 19, 15);
      doc.setLineWidth(1);
      doc.line(w / 2 - 150, h - 132, w / 2 + 150, h - 132);
      doc.setFontSize(11);
      doc.text("Programme Director, UPAY", w / 2, h - 112, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(150, 152, 145);
      doc.text(`Serial ${cert.serial}`, 64, h - 60);
      doc.text(`Issued ${formatDate(cert.issued_on)}`, w - 64, h - 60, { align: "right" });

      doc.save(`${cert.serial}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lift rounded-card bg-butter p-4 text-butter-ink">
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-white/60 dark:bg-white/10">
          <Award className="size-4" />
        </span>
        <span className="tnum text-[11px] font-semibold opacity-70">{cert.serial}</span>
      </div>
      <p className="mt-3 font-bold">{cert.volunteer_name}</p>
      <p className="text-sm opacity-85">{CERT_LABELS[cert.cert_type]}</p>
      <p className="mt-1 text-xs opacity-70">
        {Math.round(cert.hours)} hours · issued {formatDate(cert.issued_on)}
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={download} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />} PDF
      </Button>
    </div>
  );
}

function CandidateCard({ row, canIssue }: { row: CandidateRow; canIssue: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const eligibility = assessEligibility({
    totalHours: Number(row.total_hours),
    shifts: Number(row.shifts),
    verifiedShifts: Number(row.verified_shifts),
    sessionsLed: Number(row.sessions_led),
    joinedOn: row.joined_on,
  });

  const nextMilestone = Number(row.total_hours) >= 100 ? 250 : 100;
  const progress = Math.min(100, (Number(row.total_hours) / nextMilestone) * 100);

  return (
    <div className="rounded-card bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.full_name}</p>
          <p className="truncate text-xs text-muted">{row.center_name ?? "No centre"}</p>
        </div>
        <Badge tone={eligibility.eligible ? "mint" : "neutral"}>
          {Math.round(Number(row.total_hours))} h
        </Badge>
      </div>

      <div className="mt-3">
        <Meter
          value={progress}
          tone={eligibility.eligible ? "mint" : "butter"}
          label={`Progress to ${nextMilestone} hours`}
        />
        <p className="mt-1.5 text-xs text-muted">
          {eligibility.eligible
            ? eligibility.label
            : `Needs ${eligibility.shortfall}`}
          {" · "}
          {Math.round(eligibility.verifiedShare * 100)}% on site
        </p>
      </div>

      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {canIssue && eligibility.eligible && !row.already_issued ? (
        <Button
          size="sm"
          className="mt-3"
          disabled={busy || done}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = await issueCertificate({ volunteerId: row.volunteer_id });
            setBusy(false);
            if (!result.ok) setError(result.error);
            else {
              setDone(true);
              router.refresh();
            }
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {done ? "Issued" : "Issue certificate"}
        </Button>
      ) : null}

      {row.already_issued ? (
        <p className="mt-2 text-xs font-semibold text-success">Certificate already issued</p>
      ) : null}
    </div>
  );
}
