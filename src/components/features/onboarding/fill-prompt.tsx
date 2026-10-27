"use client";

import { motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The way back into setup.
 *
 * A dashboard with nothing in it is not an error, it is a person
 * who has not filled it yet, so this asks rather than warns. It
 * only appears when there is genuinely nothing to show.
 */
export function FillPrompt({ onRun }: { onRun: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.8, 0.3, 1] }}
      className="relative mb-8 overflow-hidden rounded-[var(--radius)] bg-card px-6 py-7 sm:px-8 sm:py-9"
    >
      {/* a soft wash of the accent, so the card reads as an offer
          rather than a warning */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 15% 0%, color-mix(in srgb, var(--primary) 13%, transparent), transparent 70%)",
        }}
      />

      <div className="relative flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-[0.02em] text-primary">
            <Sparkles className="size-3.5" />
            Nothing here yet
          </div>
          <h2 className="text-[clamp(21px,3.2vw,27px)] leading-tight font-bold tracking-[-0.03em] text-balance">
            Want this dashboard filled in?
          </h2>
          <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground text-pretty">
            A few quick questions about what you earn and what leaves every
            month. It takes about a minute, and every figure on this page
            comes from your answers.
          </p>
        </div>

        <Button size="lg" onClick={onRun} className="min-w-[180px]">
          <Wand2 className="size-4" />
          Set up my budget
        </Button>
      </div>
    </motion.section>
  );
}
