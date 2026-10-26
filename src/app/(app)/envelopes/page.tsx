"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvelopeRow } from "@/components/features/envelopes/envelope-row";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";
import { money } from "@/lib/utils/money";

export default function EnvelopesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, stats: st, isLoading } = useMonth(mounted ? undefined : SKIP);

  if (!mounted || isLoading || !data || !st) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;

  return (
    <Section
      title="Envelopes"
      sub={`Your ${money(st.flex, currency)} after bills, split across ${st.envRows.length}. The line marks today.`}
      pad={false}
    >
      <div className="flex flex-wrap gap-4 border-b border-border-soft px-5 py-3 text-xs text-muted-foreground">
        {([
          ["var(--primary)", "Green fine"],
          ["var(--warning)", "Orange 80% used"],
          ["var(--destructive)", "Red over budget"],
        ] as const).map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <i className="size-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {st.lean ? (
        <div className="border-b border-border-soft bg-warning/10 px-5 py-3 text-[13px] leading-relaxed">
          Income was {money(st.income, currency)} against {money(st.billTotal, currency)} of bills.{" "}
          <b className="font-semibold text-warning">{money(st.leanGap, currency)}</b> came out of the
          Emergency fund to cover it.
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-border-soft">
        {st.envRows.map((row) => (
          <EnvelopeRow
            key={row.id}
            row={row}
            st={st}
            currency={currency}
            onAdd={() => toast(`Quick add to ${row.name} arrives with the add sheet`)}
          />
        ))}
      </div>
    </Section>
  );
}
