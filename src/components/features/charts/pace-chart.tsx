"use client";

import {
  Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "@/lib/utils/money";
import type { BudgetData, MonthStats } from "@/types/budget";
import { isoDate } from "@/lib/budget";

/**
 * Spending so far against an even pace.
 *
 * The steady line runs from zero on day one to the whole budget
 * on the last day. Dividing the budget by the days and starting
 * at one day's worth would ask you to have spent money before
 * the month began.
 */
export function PaceChart({
  data, st, currency,
}: {
  data: BudgetData;
  st: MonthStats;
  currency: string;
}) {
  const days = st.daysTotal;
  if (days < 2) return null;

  const [y, m] = st.month.split("-").map(Number);
  const today = new Date();
  const isThisMonth =
    today.getFullYear() === y && today.getMonth() === m - 1;
  const dayNow = isThisMonth ? today.getDate() : days;

  const budget = st.flex;

  /* one pass to total each day, then a running sum, rather than
     accumulating into a variable from inside a render map */
  const perDay = Array.from({ length: days }, (_, i) => {
    const key = isoDate(new Date(y, m - 1, i + 1));
    return data.transactions
      .filter((t) => t.direction === "out" && t.date === key && !t.billId)
      .reduce((a, t) => a + t.amount, 0);
  });

  const rows = perDay.map((_, i) => {
    const day = i + 1;
    const running = perDay.slice(0, day).reduce((a, v) => a + v, 0);
    return {
      day,
      label: String(day),
      /* the line stops at today rather than flatlining to the end */
      spent: day <= dayNow ? Math.round(running) : null,
      steady: Math.round((budget * i) / (days - 1)),
    };
  });

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false} axisLine={false}
            interval={Math.max(2, Math.floor(days / 8))}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false} axisLine={false} width={46}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
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
            labelFormatter={(l: unknown) => `Day ${l}`}
            formatter={((v: unknown, name: unknown) => [
              money(Number(v), currency),
              name === "spent" ? "Spent so far" : "Steady pace",
            ]) as never}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)", paddingTop: 8 }}
            iconType="plainline" iconSize={14}
            formatter={(v: string) => (v === "spent" ? "Spent so far" : "Steady pace")}
          />

          <Line
            type="monotone" dataKey="steady" stroke="var(--muted-foreground)"
            strokeWidth={1.5} strokeDasharray="5 5" dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone" dataKey="spent" stroke="var(--primary)"
            strokeWidth={2.4} fill="url(#paceFill)" connectNulls={false}
            dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
