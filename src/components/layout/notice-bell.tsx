"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, Bell, CheckCircle2, TriangleAlert, type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";
import { noticeCount, notices } from "@/lib/budget";
import type { Tone } from "@/types/budget";

const icons: Record<Tone, LucideIcon> = {
  bad: AlertCircle,
  warn: TriangleAlert,
  good: CheckCircle2,
  neutral: TriangleAlert,
};

const colors: Record<Tone, string> = {
  bad: "var(--destructive)",
  warn: "var(--warning)",
  good: "var(--primary)",
  neutral: "var(--muted-foreground)",
};

const routes: Record<string, string> = {
  close: "/history", rebalance: "/rebalance", tax: "/tax",
  setup: "/setup", envelopes: "/envelopes", nospend: "/log", backup: "/setup",
};

/**
 * Everything the app wants to tell you, in one place. The count
 * ignores good news, so the badge only ever means something needs
 * you.
 */
export function NoticeBell({ mounted }: { mounted: boolean }) {
  const [open, setOpen] = useState(false);
  const { data, stats: st } = useMonth(mounted ? undefined : SKIP);

  const list = useMemo(
    () =>
      data && st ? notices(data, st, { currency: data.settings.currency }) : [],
    [data, st],
  );

  const count = noticeCount(list);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            aria-label={count ? `${count} things need you` : "Nothing needs you"}
            className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
          >
            <Bell className="size-[18px]" />
            {count > 0 ? (
              <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white tabular">
                {count}
              </span>
            ) : null}
          </button>
        }
      />

      <PopoverContent align="end" className="w-[min(340px,calc(100vw-2rem))] p-0">
        <div className="border-b border-border-soft px-4 py-3">
          <div className="text-[14.5px] font-semibold">
            {count ? `${count} thing${count === 1 ? "" : "s"} need you` : "Nothing needs you"}
          </div>
          {!count && list.length ? (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Some good news below.
            </div>
          ) : null}
        </div>

        {list.length ? (
          <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
            {list.map((n) => {
              const Icon = icons[n.tone];
              const href = routes[n.action] ?? "/";
              return (
                <Link
                  key={n.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 border-b border-border-soft px-4 py-3 transition-colors last:border-0 hover:bg-fill-2"
                >
                  <Icon
                    className="mt-px size-4 flex-none"
                    style={{ color: colors[n.tone] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-[13.5px] leading-snug font-semibold")}>
                      {n.title}
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {n.text}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-7 text-center">
            <span className="mx-auto mb-2.5 grid size-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="text-[13.5px] font-semibold">All clear</p>
            <p className="mx-auto mt-1 max-w-[30ch] text-[12.5px] text-muted-foreground">
              No envelope is over and the month is on track.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
