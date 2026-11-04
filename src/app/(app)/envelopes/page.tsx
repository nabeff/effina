"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvelopeRow } from "@/components/features/envelopes/envelope-row";
import { EnvelopeSheet } from "@/components/features/envelopes/envelope-sheet";
import { AddSheet } from "@/components/features/transactions/add-sheet";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";
import { useShell } from "@/lib/hooks/use-shell";
import { money } from "@/lib/utils/money";
import type { Envelope } from "@/types/budget";

export default function EnvelopesPage() {
  const mounted = useMounted();
  const [addTo, setAddTo] = useState<string | null>(null);
  /** the envelope being edited, or null for a new one; closed when undefined */
  const [edit, setEdit] = useState<{ envelope: Envelope | null } | null>(null);

  /* the header owns which month is on screen */
  const { month } = useShell();
  const { data, stats: st, isLoading } = useMonth(mounted ? month : SKIP);

  if (!mounted || isLoading || !data || !st) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;

  return (
    <>
    <Section
      title="Envelopes"
      sub={`Your ${money(st.flex, currency)} after bills, split across ${st.envRows.length}. The line marks today.`}
      pad={false}
      tools={
        <Button onClick={() => setEdit({ envelope: null })}>
          <Plus className="size-4" />
          New envelope
        </Button>
      }
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

      <div data-tour="envelopes" className="flex flex-col divide-y divide-border-soft">
        {st.envRows.map((row) => (
          <EnvelopeRow
            key={row.id}
            row={row}
            st={st}
            currency={currency}
            onAdd={() => setAddTo(row.id)}
            onEdit={() => setEdit({ envelope: row })}
          />
        ))}
      </div>
    </Section>

    <AddSheet
      open={addTo !== null}
      onOpenChange={(v) => { if (!v) setAddTo(null); }}
      envelopeId={addTo ?? undefined}
    />

    <EnvelopeSheet
      envelope={edit?.envelope ?? null}
      flex={st.flex}
      currency={currency}
      open={edit !== null}
      onOpenChange={(v) => { if (!v) setEdit(null); }}
    />
    </>
  );
}
