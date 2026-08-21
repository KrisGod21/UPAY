"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table2, LineChart as LineIcon } from "lucide-react";
import { Card, Table, Th, Td } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Fixed slot order — never cycled, never reassigned by rank. */
export const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

const axisProps = {
  stroke: "var(--muted)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[--radius-base] border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label !== undefined ? <p className="mb-1 font-medium text-foreground">{label}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted">
          <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="tnum ml-auto font-medium text-foreground">
            {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
            {unit ?? ""}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Wraps a chart with a title and a table view. The table is not decoration:
 * several palette slots sit below 3:1 against the light surface, and an
 * always-available table is the required relief for that.
 */
export function ChartFrame({
  title,
  description,
  rows,
  columns,
  children,
  height = 260,
  action,
}: {
  title: string;
  description?: string;
  rows?: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
  children: React.ReactNode;
  height?: number;
  action?: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const canToggle = Boolean(rows?.length && columns?.length);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {canToggle ? (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
              aria-pressed={asTable}
            >
              {asTable ? <LineIcon className="size-3.5" /> : <Table2 className="size-3.5" />}
              {asTable ? "Chart" : "Table"}
            </button>
          ) : null}
        </div>
      </div>

      {asTable && canToggle ? (
        <div className="max-h-[320px] overflow-auto">
          <Table>
            <thead>
              <tr>
                {columns!.map((c) => (
                  <Th key={c.key}>{c.label}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows!.map((r, i) => (
                <tr key={i}>
                  {columns!.map((c) => (
                    <Td key={c.key} className="tnum">
                      {String(r[c.key] ?? "—")}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

const grid = <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={false} />;

export function TrendChart({
  data,
  x,
  series,
  unit = "%",
  area = false,
}: {
  data: Record<string, unknown>[];
  x: string;
  series: { key: string; label: string }[];
  unit?: string;
  area?: boolean;
}) {
  const showLegend = series.length >= 2;

  if (area) {
    return (
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {grid}
        <XAxis dataKey={x} {...axisProps} />
        <YAxis {...axisProps} width={44} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: "var(--muted)" }} />
        {showLegend ? <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /> : null}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={SERIES[i]}
            strokeWidth={2}
            fill={`url(#fill-${s.key})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        ))}
      </AreaChart>
    );
  }

  return (
    <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
      {grid}
      <XAxis dataKey={x} {...axisProps} />
      <YAxis {...axisProps} width={44} />
      <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: "var(--muted)" }} />
      {showLegend ? <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /> : null}
      {series.map((s, i) => (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          stroke={SERIES[i]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
        />
      ))}
    </LineChart>
  );
}

export function BarsChart({
  data,
  x,
  series,
  unit = "",
  horizontal = false,
  stacked = false,
}: {
  data: Record<string, unknown>[];
  x: string;
  series: { key: string; label: string }[];
  unit?: string;
  horizontal?: boolean;
  stacked?: boolean;
}) {
  const showLegend = series.length >= 2;
  return (
    <BarChart
      data={data}
      layout={horizontal ? "vertical" : "horizontal"}
      margin={{ top: 4, right: 12, left: horizontal ? 8 : -18, bottom: 0 }}
      barCategoryGap={horizontal ? "22%" : "28%"}
    >
      <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
      {horizontal ? (
        <>
          <XAxis type="number" {...axisProps} />
          <YAxis type="category" dataKey={x} {...axisProps} width={132} />
        </>
      ) : (
        <>
          <XAxis dataKey={x} {...axisProps} interval={0} angle={-25} textAnchor="end" height={58} />
          <YAxis {...axisProps} width={44} />
        </>
      )}
      <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--surface-2)" }} />
      {showLegend ? <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /> : null}
      {series.map((s, i) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.label}
          fill={SERIES[i]}
          stackId={stacked ? "a" : undefined}
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          // 2px surface gap keeps stacked segments and neighbours from merging.
          stroke="var(--surface)"
          strokeWidth={stacked ? 2 : 0}
        />
      ))}
    </BarChart>
  );
}

export function SharePie({
  data,
  nameKey,
  valueKey,
}: {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
}) {
  return (
    <PieChart>
      <Tooltip content={<ChartTooltip />} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      <Pie
        data={data}
        dataKey={valueKey}
        nameKey={nameKey}
        innerRadius="52%"
        outerRadius="80%"
        paddingAngle={2}
        stroke="var(--surface)"
        strokeWidth={2}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={SERIES[i % SERIES.length]} />
        ))}
      </Pie>
    </PieChart>
  );
}

/** Compact inline bar for table cells — magnitude without a whole chart. */
export function MiniBar({ value, max, tone }: { value: number; max: number; tone?: string }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
        <span
          className={cn("block h-full rounded-full")}
          style={{ width: `${w}%`, background: tone ?? "var(--series-1)" }}
        />
      </span>
      <span className="tnum text-xs text-muted">{Math.round(value)}</span>
    </span>
  );
}
