"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { money } from "@/lib/utils/money";
import type { MonthStats } from "@/types/budget";

/**
 * Where the flexible money is planned to go. A ring rather than
 * a pie, so the total sits in the hole and the segments stay
 * thick enough to tell apart.
 */
export function EnvelopeDonut({
  st, currency,
}: {
  st: MonthStats;
  currency: string;
}) {
  const rows = st.envRows
    .filter((r) => r.planned > 0)
    .map((r) => ({ name: r.name, value: Math.round(r.planned), hue: r.hue }));

  if (!rows.length) return null;

  /* the unrounded total, since summing nine rounded shares drifts
     a dirham from the figure the rest of the page shows */
  const total = st.envRows.reduce((a, r) => a + r.planned, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[220px] w-[220px] flex-none">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              innerRadius={72}
              outerRadius={104}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {rows.map((r) => (
                <Cell key={r.name} fill={`var(--hue-${r.hue})`} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--elevated)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                fontSize: 13,
              }}
              formatter={((v: unknown, name: unknown) => [
                money(Number(v), currency),
                String(name),
              ]) as never}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-[21px] font-bold tracking-[-0.03em] tabular">
              {money(total, currency)}
            </div>
            <div className="text-xs text-muted-foreground">planned</div>
          </div>
        </div>
      </div>

      <div className="grid w-full flex-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 text-[13.5px]">
            <span
              className="size-[9px] flex-none rounded-[3px]"
              style={{ background: `var(--hue-${r.hue})` }}
            />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="font-semibold tabular">{money(r.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
