"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * The pause after the split.
 *
 * One bar divides into the shares just chosen. It is the first
 * time the answers become a picture rather than a form, and it
 * costs under two seconds.
 */
export function Dividing({
  draft, onDone,
}: {
  draft: Draft;
  onDone: () => void;
}) {
  const flex = draftFlex(draft);
  const total = draftSplitTotal(draft) || 100;
  const parts = draft.split.filter((e) => e.pct > 0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(onDone, reduce ? 300 : 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="py-6 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-[24px] leading-tight font-bold tracking-[-0.03em]"
      >
        {money(flex, draft.currency || "DH")} a month
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-1.5 text-[14px] text-muted-foreground"
      >
        dividing into {parts.length} envelopes
      </motion.p>

      {/* one bar, splitting */}
      <div className="mt-8 flex h-[42px] gap-[3px] overflow-hidden rounded-[10px]">
        {parts.map((e, i) => (
          <motion.span
            key={e.name}
            className="block"
            style={{ background: `var(--hue-${e.hue})` }}
            initial={{ flexGrow: total, opacity: i === 0 ? 1 : 0 }}
            animate={{ flexGrow: e.pct, opacity: 1 }}
            transition={{
              flexGrow: { delay: 0.35 + i * 0.07, duration: 0.7, ease: [0.32, 0.72, 0, 1] },
              opacity: { delay: 0.35 + i * 0.07, duration: 0.35 },
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5"
      >
        {parts.slice(0, 5).map((e) => (
          <span key={e.name} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span
              className="size-[7px] rounded-[2px]"
              style={{ background: `var(--hue-${e.hue})` }}
            />
            {e.name}
          </span>
        ))}
        {parts.length > 5 ? (
          <span className="text-[12px] text-subtle-foreground">
            and {parts.length - 5} more
          </span>
        ) : null}
      </motion.div>
    </div>
  );
}
