"use client";

import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "@/lib/utils/money";
import type { TimelineSeries } from "@/lib/budget/goals";

interface Row {
  month: string;
  idx: number;
  [key: string]: number | string;
}

/**
 * Progress as a share of each price, not as dirhams. On a dirham
 * axis a 60,000 goal flattens a 2,300 one into the baseline and
 * the chart says nothing about the small ones. At percent of
 * price every goal runs the same track, so the order they reach
 * the top is the answer you came for. The dirham figures stay in
 * the tooltip, where the detail belongs.
 */
export function GoalTimeline({
  series, prices, currency,
}: {
  series: TimelineSeries[];
  prices: Record<string, number>;
  currency: string;
}) {
  if (!series.length) return null;

  const rows: Row[] = series[0].data.map((_, i) => {
    const row: Row = { month: i === 0 ? "Now" : `${i}mo`, idx: i };
    for (const s of series) {
      const price = prices[s.id] || 1;
      row[s.name] = Math.round((s.data[i] / price) * 1000) / 10;
    }
    return row;
  });

  // Stop the axis just past the last goal to land, so the chart is
  // not mostly the flat tail after everything is paid for.
  const landed = rows.findIndex((r) =>
    series.every((s) => Number(r[s.name]) >= 99.9),
  );
  const cut = landed === -1 ? rows.length : Math.min(rows.length, landed + 3);
  const view = rows.slice(0, cut);
  const step = view.length > 24 ? 6 : view.length > 12 ? 3 : 2;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <LineChart data={view} margin={{ top: 10, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false} axisLine={false}
            interval={step - 1}
            minTickGap={8}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false} axisLine={false} width={44}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ReferenceLine
            y={100}
            stroke="var(--border)"
            strokeDasharray="4 4"
            label={{
              value: "Paid for",
              position: "insideTopLeft",
              fill: "var(--subtle-foreground)",
              fontSize: 11,
            }}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            contentStyle={{
              background: "var(--elevated)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
            labelFormatter={(l: unknown) =>
              l === "Now" ? "Today" : `In ${String(l).replace("mo", "")} months`
            }
            formatter={((v: unknown, name: unknown) => {
              const s = series.find((x) => x.name === name);
              const price = s ? prices[s.id] || 0 : 0;
              const saved = (Number(v) / 100) * price;
              return [
                `${money(saved, currency)} of ${money(price, currency)}`,
                String(name),
              ];
            }) as never}
          />
          {series.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.name}
              stroke={`var(--hue-${s.hue})`}
              strokeWidth={2.4}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-[3px] w-3.5 rounded-full"
              style={{ background: `var(--hue-${s.hue})` }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
