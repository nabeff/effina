"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { money } from "@/lib/utils/money";
import type { Win } from "@/lib/budget";

/**
 * The nearest finish line. One thing close enough to be worth
 * looking at, rather than every goal at once.
 */
export function NextWin({
  win, total, currency,
}: {
  win: Win;
  /** what it costs in full, so the bar means something */
  total: number;
  currency: string;
}) {
  const done = total > 0 ? ((total - win.left) / total) * 100 : 0;

  return (
    <Link
      href={win.kind === "goal" ? "/goals" : "/tax"}
      className="block rounded-[var(--radius)] bg-card px-[17px] py-[15px] transition-colors hover:bg-card-2"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-[34px] flex-none place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
          <Flag className="size-[17px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">
            Next win
          </div>
          <div className="mt-0.5 truncate text-[15.5px] font-semibold tracking-[-0.015em]">
            {win.name}
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            <b className="font-semibold text-foreground">{money(win.left, currency)}</b> to go
            {win.when ? `, ${win.when}` : ""}
          </div>
        </div>
      </div>

      {total > 0 ? (
        <div className="mt-3">
          <ProgressBar value={done} color="var(--primary)" height={5} />
        </div>
      ) : null}
    </Link>
  );
}
