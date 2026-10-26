"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "@/lib/utils/money";

export interface HistoryPoint {
  month: string;
  label: string;
  income: number;
  bills: number;
  spent: number;
  saved: number;
  left: number;
}

/**
 * Earned against what happened to it. Every bar is one month's
 * income, divided into what it was spent on, so the segments
 * always sum to the same height and the comparison is between
 * the divisions rather than between the totals.
 */
export function HistoryChart({
  points, currency,
}: {
  points: HistoryPoint[];
  currency: string;
}) {
  if (!points.length) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={points} margin={{ top: 10, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false} axisLine={false} width={46}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--fill-2)" }}
            contentStyle={{
              background: "var(--elevated)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
            formatter={((v: unknown, name: unknown) => [
              money(Number(v), currency),
              String(name),
            ]) as never}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)", paddingTop: 8 }}
            iconType="circle" iconSize={8}
          />
          <Bar dataKey="bills" name="Bills" stackId="out" maxBarSize={52}
            fill="var(--hue-pink)" isAnimationActive={false} />
          <Bar dataKey="spent" name="Spending" stackId="out" maxBarSize={52}
            fill="var(--hue-indigo)" isAnimationActive={false} />
          <Bar dataKey="saved" name="Saved" stackId="out" maxBarSize={52}
            fill="var(--hue-green)" isAnimationActive={false} />
          <Bar dataKey="left" name="Unspent" stackId="out" maxBarSize={52}
            fill="var(--fill-2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
