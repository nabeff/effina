"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "@/lib/utils/money";
import type { FlowPoint } from "@/lib/budget";

/**
 * What was kept each month, which is income minus everything that
 * went out. A bar below the line is a month that ate into
 * reserves, and that is the thing worth seeing at a glance.
 *
 * The month still running is drawn hollow, because a month with
 * days left in it is not comparable with a finished one.
 */
export function FlowChart({
  points, currency,
}: {
  points: FlowPoint[];
  currency: string;
}) {
  if (points.length < 2) return null;

  return (
    <div className="h-[190px] w-full">
      <ResponsiveContainer>
        <BarChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11.5 }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11.5 }}
            tickLine={false} axisLine={false} width={38}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Tooltip
            cursor={{ fill: "var(--fill-2)" }}
            contentStyle={{
              background: "var(--elevated)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
            formatter={((v: unknown, _n: unknown, item: { payload?: FlowPoint }) => [
              money(Number(v), currency),
              item?.payload?.partial ? "Kept so far, month still running" : "Kept",
            ]) as never}
          />
          <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false}>
            {points.map((p) => {
              const color = p.net >= 0 ? "var(--primary)" : "var(--destructive)";
              return (
                <Cell
                  key={p.month}
                  fill={p.partial ? "transparent" : color}
                  stroke={color}
                  strokeWidth={p.partial ? 1.5 : 0}
                  strokeDasharray={p.partial ? "3 3" : undefined}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
