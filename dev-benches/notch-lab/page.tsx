"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, Undo2 } from "lucide-react";
import { HEAD_H, INNER_R, PAD, Notch, type Tone } from "@/components/features/island/notch";
import { Island } from "@/components/features/island/island";
import type { Signal } from "@/lib/budget";
import { Typed } from "@/components/features/island/typed";
import { cn } from "@/lib/utils";

/* A bench for the island. Mock data, nothing wired. */

const EASE = [0.32, 0.72, 0, 1] as const;

interface Turn {
  you: string;
  mazaj: string;
  card: "pace" | "envelope" | "bills";
}

const MOCK_SIGNALS: Signal[] = [
  {
    id: "calm",
    kind: "calm",
    tone: "good",
    icon: "check",
    line: "All good today",
    detail: "180 DH a day for the next 4 days.",
    rank: 9,
  },
];

const SCRIPT: Turn[] = [
  {
    you: "How much can I spend today?",
    mazaj:
      "You can spend 180 DH today. That keeps you on track for the 4 days left this month.",
    card: "pace",
  },
  {
    you: "Add 200 groceries",
    mazaj: "Done. 200 DH added to Groceries. 340 DH left in that envelope.",
    card: "envelope",
  },
  {
    you: "What is due this week?",
    mazaj: "Two things: Internet 299 DH on Friday, and Gym 250 DH on Sunday.",
    card: "bills",
  },
];

export default function NotchLab() {
  const [tone, setTone] = useState<Tone>("good");
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [laps, setLaps] = useState(0);

  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [bodyH, setBodyH] = useState(140);
  const vw = useViewport();

  /* The island's open height is whatever its content needs.
     The body only exists once the panel has mounted, which is
     after any effect on this render, so a callback ref catches
     the node the moment it appears.

     offsetHeight rather than the observer's box, because the
     content is mid transform while it rises and a transformed
     box reports where it is rather than where it belongs. */
  useLayoutEffect(() => {
    if (!bodyEl) return;
    const read = () => setBodyH(bodyEl.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(bodyEl);
    const mo = new MutationObserver(read);
    mo.observe(bodyEl, { childList: true, subtree: true, attributes: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [bodyEl]);

  function ask(t: Turn) {
    setThinking(true);
    setTurns((all) => [...all, t]);
    setTimeout(() => setThinking(false), 900);
  }

  /* open and close twenty times, to prove it never glitches */
  function stress() {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setOpen((o) => !o);
      setLaps(Math.ceil(n / 2));
      if (n >= 40) clearInterval(t);
    }, 600);
  }

  const next = SCRIPT[turns.length] ?? null;
  const maxH = typeof window !== "undefined" ? window.innerHeight * 0.7 : 540;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed inset-x-0 top-0 z-30 h-[54px] bg-chrome" />

      {/* the real island, so what is tested is what ships */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <Island signals={MOCK_SIGNALS} currency="DH" />
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden">
        <Notch
          tone={tone}
          open={open}
          width={Math.min(420, vw - 40)}
          height={Math.min(bodyH + HEAD_H, maxH)}
          line={{ id: "calm", tone: "good", text: "All good today" }}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        >
          {/* measured whole, so the island's height is exactly
              what its content needs and never a guess plus a
              constant that drifts when the chrome changes */}
          <div ref={setBodyEl} className="flex flex-col">
            <div
              className="min-h-0 shrink overflow-y-auto"
              style={{
                paddingLeft: PAD,
                paddingRight: PAD,
                paddingTop: 4,
                paddingBottom: PAD,
              }}
            >
              <div className="space-y-3">
                {!turns.length ? (
                  <Rise>
                    <p className="pb-1 text-[13px] text-muted-foreground">
                      Nothing needs you right now.
                    </p>
                  </Rise>
                ) : null}

                {turns.map((t, i) => (
                  <Exchange
                    key={i}
                    turn={t}
                    thinking={thinking && i === turns.length - 1}
                    delay={0.06 * i}
                  />
                ))}
              </div>
            </div>

            {next ? (
              <Rise delay={0.12}>
                <div
                  className="flex flex-none flex-wrap gap-1.5"
                  style={{ paddingLeft: PAD, paddingRight: PAD, paddingBottom: PAD }}
                >
                  <button
                    onClick={() => ask(next)}
                    className="rounded-full border border-hairline px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {next.you}
                  </button>
                </div>
              </Rise>
            ) : null}

            <Rise delay={0.18}>
              <div
                className="box-content flex flex-none items-center gap-1.5 border-t border-white/[0.06]"
                style={{
                  /* box-content, so the 1px top border sits
                     outside the height rather than stealing a
                     pixel from the top half and tipping
                     everything inside it down */
                  height: HEAD_H + PAD,
                  paddingLeft: PAD,
                  paddingRight: PAD,
                }}
              >
                <span className="flex-1 text-[13.5px] leading-none text-subtle-foreground">
                  Ask, or tell me what you spent
                </span>
                <span className="grid size-7 flex-none place-items-center rounded-full text-muted-foreground">
                  <Mic className="size-[15px]" />
                </span>
                {/* concentric with the panel's own corner */}
                <span
                  className="grid size-7 flex-none place-items-center bg-fill-2 text-subtle-foreground"
                  style={{ borderRadius: INNER_R }}
                >
                  <ArrowUp className="size-[15px]" />
                </span>
              </div>
            </Rise>
          </div>
        </Notch>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-8 pt-[220px]">
        {(["good", "warn", "bad"] as Tone[]).map((t) => (
          <Chip key={t} on={tone === t} onClick={() => setTone(t)}>
            {t}
          </Chip>
        ))}
        <span className="mx-2 h-6 w-px bg-border-soft" />
        <Chip onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Expand"}</Chip>
        <Chip onClick={stress}>Open and close 20 times</Chip>
        <Chip onClick={() => setTurns([])}>Reset chat</Chip>
        {laps ? (
          <span className="text-[12.5px] text-muted-foreground tabular">
            lap {laps} of 20
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Rise({
  delay = 0, children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE, delay: 0.2 + delay }}
    >
      {children}
    </motion.div>
  );
}

function Exchange({
  turn, thinking, delay,
}: {
  turn: Turn;
  thinking: boolean;
  delay: number;
}) {
  const [replied, setReplied] = useState(false);

  return (
    <div className="space-y-2.5">
      <Rise delay={delay}>
        <p className="ml-auto w-fit max-w-[82%] rounded-[14px] rounded-br-[5px] bg-card-2 px-3 py-2 text-[13px]">
          {turn.you}
        </p>
      </Rise>

      {thinking ? (
        <Thinking />
      ) : (
        <Rise delay={delay + 0.06}>
          <p className="max-w-[90%] text-[13px] leading-relaxed">
            <Typed text={turn.mazaj} onDone={() => setReplied(true)} />
          </p>
        </Rise>
      )}

      <AnimatePresence>
        {replied ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <ReplyCard card={turn.card} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Thinking() {
  return (
    <span className="flex gap-1 px-1 py-2">
      {[0, 1, 2].map((n) => (
        <motion.span
          key={n}
          className="size-[5px] rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: n * 0.16 }}
        />
      ))}
    </span>
  );
}

function ReplyCard({ card }: { card: Turn["card"] }) {
  if (card === "pace") {
    return (
      <Card>
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-muted-foreground">Today</span>
          <span className="font-semibold tabular">45 / 180 DH</span>
        </div>
        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-fill-2">
          <motion.span
            className="block h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: "25%" }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          />
        </div>
      </Card>
    );
  }

  if (card === "envelope") {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-semibold">Groceries</div>
            <div className="text-[11.5px] text-muted-foreground tabular">
              340 DH left
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-fill-2 px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground">
            <Undo2 className="size-[12px]" />
            Undo
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {[
        { name: "Internet", amount: "299 DH", when: "Friday" },
        { name: "Gym", amount: "250 DH", when: "Sunday" },
      ].map((b, i) => (
        <div
          key={b.name}
          className={cn(
            "flex items-center gap-3 py-2",
            i > 0 && "border-t border-border-soft",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold">{b.name}</div>
            <div className="text-[11.5px] text-muted-foreground">{b.when}</div>
          </div>
          <span className="text-[12.5px] font-semibold tabular">{b.amount}</span>
          <button className="rounded-full bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-primary-foreground">
            Pay
          </button>
        </div>
      ))}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-hairline bg-card px-3 py-2.5">
      {children}
    </div>
  );
}

function Chip({
  on, onClick, children,
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-[13px]",
        on
          ? "bg-primary font-semibold text-primary-foreground"
          : "bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function useViewport() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const read = () => setW(window.innerWidth);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return w;
}
