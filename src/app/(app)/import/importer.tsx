"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Check, FileSpreadsheet, Loader2, TriangleAlert, Upload } from "lucide-react";
import {
  STUDENT_FIELDS,
  guessMapping,
  applyMapping,
  type MapResult,
} from "@/lib/csv-map";
import { importStudents, type ImportOutcome } from "./actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Table, Td, Th } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Importer({ centres }: { centres: string[] }) {
  const router = useRouter();

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  const result: MapResult | null = useMemo(
    () => (records.length ? applyMapping(records, mapping, STUDENT_FIELDS) : null),
    [records, mapping],
  );

  function handleFile(file: File) {
    setParseError(null);
    setOutcome(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (parsed) => {
        const cols = (parsed.meta.fields ?? []).filter(Boolean);
        if (!cols.length) {
          setParseError("That file has no header row, so its columns cannot be mapped.");
          return;
        }
        setHeaders(cols);
        setRecords(parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? "").trim())));
        setMapping(guessMapping(cols, STUDENT_FIELDS));
      },
      error: () => setParseError("That file could not be read as CSV."),
    });
  }

  async function runImport() {
    if (!result?.valid.length) return;
    setBusy(true);
    const payload = result.valid.map((r) => ({
      full_name: String(r.values.full_name),
      center: String(r.values.center),
      student_code: r.values.student_code ?? null,
      dob: r.values.dob ?? null,
      gender: r.values.gender ?? null,
      guardian_name: r.values.guardian_name ?? null,
      guardian_phone: r.values.guardian_phone ?? null,
      level: r.values.level ?? null,
    }));
    const res = await importStudents(payload);
    setOutcome(res);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" /> 1 · Choose the spreadsheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-4 py-10 text-center transition-colors hover:border-primary hover:bg-primary-soft",
            )}
          >
            <Upload className="size-6 text-primary" />
            <span className="text-sm font-semibold">
              {fileName ?? "Drop a CSV here, or click to choose one"}
            </span>
            <span className="text-xs text-muted">
              Export any sheet as CSV first. Headers can be named anything — you confirm the mapping
              next.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>

          {parseError ? (
            <p className="mt-3 flex items-start gap-2 rounded-base bg-danger-soft px-3 py-2 text-sm text-danger">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {parseError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {headers.length ? (
        <Card className="animate-in">
          <CardHeader>
            <CardTitle>2 · Confirm the columns</CardTitle>
            <p className="text-xs text-muted">
              Guessed from your headers. Change anything that looks wrong — nothing is written until
              you import.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {STUDENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block px-1 text-sm font-semibold">
                    {field.label}
                    {field.required ? <span className="ml-1 text-danger">*</span> : null}
                  </label>
                  <Select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (e.target.value) next[field.key] = e.target.value;
                        else delete next[field.key];
                        return next;
                      })
                    }
                  >
                    <option value="">— not in this file —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-base bg-surface-2 p-3 text-xs text-muted">
              Centre is matched by name or code against centres already in the system. A centre that
              does not exist is reported rather than created — a typo in a spreadsheet should not
              spawn a centre nobody runs. Existing centres:{" "}
              <span className="font-medium text-foreground">{centres.slice(0, 6).join(", ")}</span>
              {centres.length > 6 ? ` and ${centres.length - 6} more` : ""}.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card className="animate-in">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>3 · Review and import</CardTitle>
              <div className="flex gap-2">
                <Badge tone="mint">{result.valid.length} ready</Badge>
                {result.invalid.length ? (
                  <Badge tone="danger">{result.invalid.length} with problems</Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {result.invalid.length ? (
              <div className="mb-4 rounded-card bg-danger-soft p-4">
                <p className="text-sm font-semibold text-danger">
                  These rows will be skipped
                </p>
                <ul className="mt-2 space-y-1 text-sm text-danger">
                  {result.invalid.slice(0, 6).map((r) => (
                    <li key={r.row}>
                      Row {r.row}: {r.errors.join("; ")}
                    </li>
                  ))}
                  {result.invalid.length > 6 ? (
                    <li>…and {result.invalid.length - 6} more.</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div className="max-h-80 overflow-auto rounded-card border border-border">
              <Table>
                <thead className="sticky top-0 bg-surface">
                  <tr>
                    <Th>Row</Th>
                    {STUDENT_FIELDS.map((f) => (
                      <Th key={f.key}>{f.label}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 50).map((r) => (
                    <tr key={r.row} className={r.errors.length ? "bg-danger-soft/40" : undefined}>
                      <Td className="tnum text-muted">{r.row}</Td>
                      {STUDENT_FIELDS.map((f) => (
                        <Td key={f.key} className="whitespace-nowrap">
                          {r.values[f.key] ?? <span className="text-muted">—</span>}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {outcome ? (
              <div
                className={cn(
                  "mt-4 rounded-card p-4",
                  outcome.ok ? "bg-mint text-mint-ink" : "bg-danger-soft text-danger",
                )}
              >
                <p className="font-bold">
                  {outcome.ok
                    ? `Imported ${outcome.inserted} children.`
                    : (outcome.error ?? "The import failed.")}
                </p>
                {outcome.skipped ? (
                  <p className="mt-1 text-sm opacity-85">{outcome.skipped} rows were skipped.</p>
                ) : null}
                {outcome.unknownCentres.length ? (
                  <p className="mt-1 text-sm opacity-85">
                    Unrecognised centres: {outcome.unknownCentres.join(", ")}. Create them first, or
                    correct the spelling in the file.
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button
              className="mt-4"
              onClick={runImport}
              disabled={busy || !result.valid.length || Boolean(outcome?.ok)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              {outcome?.ok ? "Imported" : `Import ${result.valid.length} children`}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
