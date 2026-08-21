"use server";

import { requireProfile } from "@/lib/auth";
import { guardSql } from "@/lib/sql-guard";
import { writeSql, interpretResult, geminiAvailable } from "@/lib/gemini";
import type { ChartSpec } from "@/lib/types";

export interface AskResult {
  ok: boolean;
  question: string;
  answer?: string;
  sql?: string;
  intent?: string;
  rows?: Record<string, unknown>[];
  chart?: ChartSpec;
  durationMs?: number;
  error?: string;
  /** Set when the guard, not the database, refused the query. */
  blocked?: boolean;
}

export async function ask(question: string): Promise<AskResult> {
  const started = Date.now();
  const trimmed = question.trim();

  if (!trimmed) return { ok: false, question, error: "Ask a question first." };
  if (trimmed.length > 500) {
    return { ok: false, question, error: "That question is too long — try asking it more directly." };
  }
  if (!geminiAvailable()) {
    return {
      ok: false,
      question: trimmed,
      error: "GEMINI_API_KEY is not configured, so UpayGPT cannot write a query.",
    };
  }

  const { profile, supabase } = await requireProfile();

  const log = async (fields: Record<string, unknown>) => {
    await supabase.from("ai_queries").insert({
      user_id: profile.id,
      question: trimmed,
      duration_ms: Date.now() - started,
      ...fields,
    });
  };

  let plan;
  try {
    plan = await writeSql(trimmed);
  } catch (err) {
    const error = err instanceof Error ? err.message : "The model could not be reached.";
    await log({ error });
    return { ok: false, question: trimmed, error };
  }

  if (plan.refused || !plan.sql.trim()) {
    const error = plan.intent || "That question cannot be answered from the data held here.";
    await log({ error, generated_sql: plan.sql || null });
    return { ok: false, question: trimmed, error, intent: plan.intent };
  }

  // The database enforces the same rules; this layer just fails readably first.
  const guard = guardSql(plan.sql);
  if (!guard.ok) {
    await log({ error: guard.reason, generated_sql: plan.sql });
    return {
      ok: false,
      question: trimmed,
      sql: plan.sql,
      error: `The generated query was blocked: ${guard.reason}`,
      blocked: true,
    };
  }

  const { data, error: dbError } = await supabase.rpc("upaygpt_query", {
    query_text: guard.sql!,
  });

  if (dbError) {
    await log({ error: dbError.message, generated_sql: guard.sql });
    return {
      ok: false,
      question: trimmed,
      sql: guard.sql,
      error: `The query did not run: ${dbError.message}`,
    };
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  let interpretation;
  try {
    interpretation = await interpretResult(trimmed, guard.sql!, rows);
  } catch {
    interpretation = {
      answer: `The query returned ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
      chart: { type: "none", x: "", y: [] } as ChartSpec,
    };
  }

  const durationMs = Date.now() - started;

  await log({
    generated_sql: guard.sql,
    row_count: rows.length,
    // Keep the log small; the full result is already on screen.
    result_json: rows.slice(0, 50),
    chart_spec: interpretation.chart,
    answer: interpretation.answer,
    duration_ms: durationMs,
  });

  return {
    ok: true,
    question: trimmed,
    answer: interpretation.answer,
    sql: guard.sql,
    intent: plan.intent,
    rows,
    chart: interpretation.chart,
    durationMs,
  };
}
