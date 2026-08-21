"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CornerDownLeft,
  Database,
  Loader2,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ask, type AskResult } from "./actions";
import { Badge, Button, Card, Table, Td, Th } from "@/components/ui";
import { TrendChart, BarsChart, SharePie } from "@/components/charts";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Which centres had the lowest attendance last month?",
  "Show the attendance trend by week for the last three months",
  "Which volunteers gave the most hours this year?",
  "Which children have attended less than half their classes?",
  "How many lessons were scheduled but never delivered?",
  "Compare average assessment scores across zones",
];

export function UpayGptChat() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<AskResult[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, pending]);

  async function submit(q: string) {
    if (!q.trim() || pending) return;
    setQuestion("");
    setPending(true);
    try {
      const result = await ask(q);
      setHistory((h) => [...h, result]);
    } catch {
      setHistory((h) => [
        ...h,
        { ok: false, question: q, error: "UpayGPT could not be reached. Check the connection and try again." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {history.length === 0 && !pending ? (
        <Card className="p-6">
          <Sparkles className="mb-3 size-6 text-accent" />
          <h2 className="text-lg font-semibold">Ask about the programme in plain language</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            UpayGPT writes a read-only query, runs it against the live database, and shows you both
            the answer and the SQL it used. It can only read the data your own account is allowed to
            see — asking nicely does not widen your access.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {history.map((r, i) => (
        <Exchange key={i} result={r} />
      ))}

      {pending ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Writing a query, running it, and reading the result…
        </Card>
      ) : null}

      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(question);
        }}
        className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background pb-1 pt-3"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(question);
            }
          }}
          rows={2}
          placeholder="Which centres need more volunteers?"
          className="min-h-[46px] flex-1 resize-none rounded-[--radius-base] border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" disabled={pending || !question.trim()} className="h-[46px]">
          {pending ? <Loader2 className="animate-spin" /> : <CornerDownLeft />}
          Ask
        </Button>
      </form>
    </div>
  );
}

function Exchange({ result }: { result: AskResult }) {
  const [showSql, setShowSql] = useState(false);
  const [showRows, setShowRows] = useState(false);

  return (
    <div className="animate-in space-y-2">
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-[--radius-base] bg-primary-soft px-3.5 py-2 text-sm text-primary">
          {result.question}
        </p>
      </div>

      <Card className="p-5">
        {result.ok ? (
          <>
            <p className="text-sm leading-relaxed">{result.answer}</p>

            {result.chart && result.chart.type !== "none" && result.rows?.length ? (
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(result.chart, result.rows)}
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone="neutral">
                {result.rows?.length ?? 0} row{result.rows?.length === 1 ? "" : "s"}
              </Badge>
              {result.durationMs ? <Badge tone="neutral">{(result.durationMs / 1000).toFixed(1)}s</Badge> : null}
              <button
                type="button"
                onClick={() => setShowSql((v) => !v)}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ChevronDown className={cn("size-3.5 transition-transform", showSql && "rotate-180")} />
                See the SQL I ran
              </button>
              {result.rows?.length ? (
                <button
                  type="button"
                  onClick={() => setShowRows((v) => !v)}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Database className="size-3.5" />
                  {showRows ? "Hide" : "Show"} the data
                </button>
              ) : null}
            </div>

            {showSql && result.sql ? (
              <pre className="mt-3 overflow-x-auto rounded-[--radius-base] bg-surface-2 p-3 text-xs leading-relaxed">
                <code>{result.sql}</code>
              </pre>
            ) : null}

            {showRows && result.rows?.length ? (
              <div className="mt-3 max-h-[320px] overflow-auto rounded-[--radius-base] border border-border">
                <Table>
                  <thead>
                    <tr>
                      {Object.keys(result.rows[0]).map((k) => (
                        <Th key={k}>{k.replace(/_/g, " ")}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 100).map((row, i) => (
                      <tr key={i}>
                        {Object.keys(result.rows![0]).map((k) => (
                          <Td key={k} className="tnum whitespace-nowrap">
                            {formatCell(row[k])}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex items-start gap-2.5">
            {result.blocked ? (
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            )}
            <div className="min-w-0">
              <p className="text-sm">{result.error}</p>
              {result.blocked ? (
                <p className="mt-1 text-xs text-muted">
                  The query never reached the database. Only single read-only statements are
                  permitted, and the database enforces that again independently.
                </p>
              ) : null}
              {result.sql ? (
                <pre className="mt-2 overflow-x-auto rounded-[--radius-base] bg-surface-2 p-3 text-xs">
                  <code>{result.sql}</code>
                </pre>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return String(Math.round(value * 100) / 100);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderChart(chart: { type: string; x: string; y: string[] }, rows: Record<string, unknown>[]) {
  const series = chart.y.map((key) => ({ key, label: key.replace(/_/g, " ") }));

  switch (chart.type) {
    case "line":
      return <TrendChart data={rows} x={chart.x} series={series} unit="" />;
    case "area":
      return <TrendChart data={rows} x={chart.x} series={series} unit="" area />;
    case "pie":
      return <SharePie data={rows.slice(0, 6)} nameKey={chart.x} valueKey={chart.y[0]} />;
    case "bar":
    default:
      return <BarsChart data={rows} x={chart.x} series={series} horizontal={rows.length > 6} />;
  }
}
