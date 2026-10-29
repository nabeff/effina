"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { EdgeLight } from "./edge-light";
import { LivingDot } from "./living-dot";
import { Ticker } from "./ticker";
import type { Line, Moment } from "@/lib/budget";

/**
 * The island.
 *
 * A pill that floats below the top edge rather than hanging off
 * it. Rounded on every corner, with air above it, so it reads
 * as an object resting on the page instead of a cutout in the
 * screen.
 *
 * One element, always. Opening animates its own width and height
 * rather than swapping a pill for a panel, so nothing ever
 * unmounts, and the dot inside it is a shared layout element
 * that travels from the middle of the closed pill to the top
 * left of the open one.
 *
 * Width leads and height follows a beat later, which is what
 * makes Apple's read as a thing stretching rather than a box
 * resizing.
 */

const RADIUS = 18;
/** one inset for every edge of the panel */
export const PAD = 14;
/** concentric: an inner corner is the outer one less the gap
    between them, which is what keeps curves parallel */
export const INNER_R = RADIUS - PAD;
const SHUT_W = 152;
/* the bar's own height, so the closed notch shares its
   centre line with the logo and the icons */
const SHUT_H = 54;
/** the open panel's header row, which the dot centres against.
    Exported so whoever measures the body can add exactly this
    rather than a constant that drifts when the row changes. */
export const HEAD_H = 60;
/** the input row, which is a control rather than a title row */
export const INPUT_H = 40;

/* firm enough to feel immediate, damped enough never to wobble */
/**
 * Slow motion, for watching the close.
 *
 * Set window.__islandSlow to a number in the console, or press
 * Alt and S on the bench. Every duration and every spring is
 * divided by it, so the whole sequence stretches together and
 * nothing falls out of step.
 */
function slowFactor() {
  if (typeof window === "undefined") return 1;
  const n = (window as unknown as { __islandSlow?: number }).__islandSlow;
  return typeof n === "number" && n > 0 ? n : 1;
}

const BASE_SPRING = { stiffness: 380, damping: 34, mass: 0.9 } as const;
const EASE = [0.32, 0.72, 0, 1] as const;

export type Tone = "good" | "warn" | "bad";

const DOT: Record<Tone, string> = {
  good: "var(--primary)",
  warn: "var(--hue-orange)",
  bad: "var(--destructive)",
};

export function Notch({
  tone = "good",
  open = false,
  width,
  height,
  line,
  moment,
  shutHeight = SHUT_H,
  onOpen,
  onClose,
  children,
}: {
  tone?: Tone;
  open?: boolean;
  /** the open size. Ignored while shut. */
  width: number;
  height: number;
  /** the one line the closed pill shows */
  line: Line;
  /** the flourish playing right now, if any */
  moment?: Moment | null;
  /** the bar's current height, so the two stay on one centre
      line even while the bar is shrinking */
  shutHeight?: number;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const shell = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();

  /* A dev only multiplier, read fresh on every render. It is
     not state because nothing should re-render when it changes,
     and the next open or close picks it up on its own. */
  const slow = slowFactor();

  /**
   * At normal speed this is the spring. Slowed down it becomes
   * a tween of the same shape, because a spring's duration is
   * a consequence of its physics rather than a number, and
   * every attempt to scale stiffness and damping together ends
   * up either faster or wobbling.
   *
   * visualDuration gives Framer the time and lets it solve the
   * spring for it, so the curve is the same and only the clock
   * changes.
   */
  /* how long the shape itself takes, so everything inside it
     can be timed as a fraction of that rather than against a
     constant that no longer matches once it is slowed */
  const shapeMs = slow === 1 ? 0.44 : 0.42 * slow;

  const SPRING = useMemo(
    () =>
      slow === 1
        ? {
            type: "spring" as const,
            /* long enough to follow, short enough not to wait on */
            visualDuration: 0.44,
            bounce: 0.08,
          }
        : {
            type: "spring" as const,
            visualDuration: 0.42 * slow,
            bounce: 0.06,
          },
    [slow],
  );

  /**
   * Closing is four beats, not one transition.
   *
   * The content has to be gone before the shape moves, and the
   * shape has to be still before the line reads, or the eye sees
   * text sliding inside a box that is also sliding. Framer can
   * stagger a sequence but it cannot know that a spring has
   * settled, so the phase is tracked here.
   *
   * open      everything is out
   * emptying  content fading down, shape still open
   * shrinking the shape springing back, nothing inside it
   * shut      the line revealing from the dot outward
   */
  /* How far through the close we are. Opening needs no steps,
     so it is read straight from the prop. Closing is a sequence
     of three, and the timers own it.

     The key is the prop itself, so a change of `open` resets the
     count without anything being set during render. */
  /**
   * Closing, in four beats.
   *
   * 0 content leaving, 140ms, the shape has not moved
   * 1 the shape collapsing, height then width, on one spring
   * 2 the closed line arriving, once the spring says it is done
   * 3 alive again, half a second later
   *
   * Step 2 waits on the spring rather than a timer, because a
   * timer only guesses when a spring has settled and the whole
   * point is that the text never moves while the box does.
   */
  /* Keyed on open: entering the open state resets the counter
     to 1, so the close always starts from its first beat and
     the first ever render starts at 0, meaning never opened. */
  const [opened, setOpened] = useState(open);
  const [step, setStep] = useState(0);
  if (opened !== open) {
    setOpened(open);
    setStep(open ? 1 : step);
  }
  const [settled, setSettled] = useState(!open);

  /* Settled means the box has stopped moving, not that one of
     its properties has. Framer's onAnimationComplete fires per
     property and height always finishes first, which is what
     made the width jump the last twenty pixels. */
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    let last = { w: 0, h: 0 };
    let stillFor = 0;
    let raf = 0;
    const tick = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const moved =
        Math.abs(w - last.w) >= 0.5 || Math.abs(h - last.h) >= 0.5;
      if (moved) {
        /* only on the edge, never once per frame */
        if (stillFor >= 3) setSettled(false);
        stillFor = 0;
      } else {
        stillFor += 1;
        /* three frames unchanged is a stopped spring */
        if (stillFor === 3) setSettled(true);
      }
      last = { w, h };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const [rested, setRested] = useState(0);

  /* The close is two timed beats. While open, step is held at
     1 by the key below rather than set here, so nothing has to
     write state the moment the prop changes. */
  useEffect(() => {
    if (open || still || step !== 1) return;
    const t = setTimeout(() => setStep(2), 140 * slowFactor());
    return () => clearTimeout(t);
  }, [open, still, step]);

  /* back to rest once the shape has stopped */
  useEffect(() => {
    if (open || !settled || step !== 2) return;
    const t = setTimeout(() => setStep(0), 60);
    return () => clearTimeout(t);
  }, [open, settled, step]);

  /* step 3: ambient resumes half a second after it is home */
  useEffect(() => {
    if (open || !settled || step < 2) return;
    const t = setTimeout(() => setRested((n) => n + 1), 500 * slowFactor());
    return () => clearTimeout(t);
  }, [open, settled, step]);

  /* Closing is only a thing that can happen to something that
     was open. On the first render nothing has been, so step 0
     must not be read as content leaving, or the island mounts
     at panel size and animates shut in front of the person. */
  const phase: "open" | "emptying" | "shrinking" | "shut" = open
    ? "open"
    : still || step === 0
      ? /* 0 is the resting value, both before the first open
           and after a close has finished */
        "shut"
      : step === 1
        ? "emptying"
        : settled
          ? "shut"
          : "shrinking";

  const idle = phase === "shut" && rested > 0;

  /* the shape only moves once the content has gone */
  const wide = phase === "open" || phase === "emptying";



  return (
    <div className="pointer-events-none flex w-full justify-center">
      <motion.div
        ref={shell}
        data-tour="island"
        /* Width leads, height follows 60ms later, so the shape
           stretches sideways before it drops. On the way out the
           order reverses. */
        animate={{
          width: wide ? width : SHUT_W,
          height: wide ? height : shutHeight,
        }}
        /* Opening: width first, height a beat later, so it
           stretches sideways then drops. Closing reverses it,
           height first then width, so it folds up then in. */
        transition={{
          width: { ...SPRING, delay: open ? 0 : 0.04 },
          height: { ...SPRING, delay: open ? 0.04 : 0 },
          borderRadius: { duration: 0.3 * slow, ease: EASE },
        }}
        onAnimationStart={() => setSettled(false)}
        /* the shell clips, because it is the element that is
           narrower than its own content while it is moving */
        className="pointer-events-auto relative overflow-hidden"
        style={{
          borderRadius: RADIUS,
          /* Two shadows: a wide soft one for the distance it
             floats above the page, and a tight one for the
             contact. On the shell rather than the face, because
             the face is clipped and a clipped shadow never
             reaches outside the shape. */
          boxShadow: [
            /* a hairline of light all the way round, which is
               what separates a black object from a black hole */
            "0 0 0 1px rgb(255 255 255 / 0.08)",
            "0 12px 32px -8px rgb(0 0 0 / 0.8)",
            "0 4px 10px -3px rgb(0 0 0 / 0.6)",
          ].join(", "),
        }}
      >
        {/* Lit from below, barely. It is what stops the shape
            reading as a cutout, without anything you would call
            a glow. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 -bottom-1 top-1/2 -z-10 rounded-[50%] blur-[14px]"
          style={{ background: DOT[tone], opacity: 0.07 }}
        />

        {/* the travelling light, which traces whatever shape the
            shell currently is */}
        <EdgeLight of={shell} radius={RADIUS} />

        <div
          className="relative size-full overflow-hidden bg-ink"
          style={{
            borderRadius: RADIUS,
            /* a thin lit edge along the top, where a real
               object sitting in light would catch it */
            boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.1)",
          }}
        >
          {/* The dot exists in both states and travels between
              them rather than fading. It is centred by a flex
              row whose height matches the row it belongs to, so
              the browser does the centring at any font size. */}
          {/* Open, the dot sits at the inset like every other
              edge. Shut, it is the first half of a centred pair,
              so it is placed by the row rather than by a number
              that cannot know how wide the text is. */}
          {/* The open panel's dot, which lives in its header
              row. The closed one lives in the closed row. They
              are two elements rather than one travelling
              between parents, because interpolating a box
              across two different layouts is what made it fall
              below the line and then vanish. */}
          {phase === "open" ? (
            <div
              className="absolute z-20 flex items-center"
              style={{ top: 0, left: PAD, height: HEAD_H }}
            >
              <LivingDot tone={tone} moment={null} idle={false} />
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {phase === "open" || phase === "emptying" ? (
              <motion.div
                key="open"
                initial={{ opacity: 0, y: -4 }}
                animate={{
                  opacity: phase === "emptying" ? 0 : 1,
                  /* down rather than up, as if settling */
                  y: phase === "emptying" ? 4 : 0,
                }}
                exit={{ opacity: 0, y: 4, transition: { duration: 0.14 * slow } }}
                transition={{
                  duration: 0.18 * slow,
                  ease: EASE,
                  delay: (open ? 0.14 : 0) * slow,
                }}
                /* The content matches the shell at every frame
                   rather than being pinned at its final width.
                   Pinned, the shell clips it while it grows, so
                   you see the middle of a wider layout and the
                   whole thing appears to jump into place when
                   the clip finally lifts. */
                className="flex h-full w-full flex-col"
              >
                <header
                  className="flex flex-none items-center gap-2"
                  style={{
                    height: HEAD_H,
                    /* the dot occupies the inset, so the title
                       starts one gap past it */
                    paddingLeft: PAD + 9 + 8,
                    paddingRight: PAD,
                  }}
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase === "emptying" ? 0 : 1 }}
                    /* last out, first in, which is the reverse of
                       everything below it */
                    transition={{
                      duration: 0.12 * slow,
                      delay: open ? shapeMs * 0.45 : 0.05 * slow,
                    }}
                    className="block text-[12px] leading-none font-semibold tracking-[0.02em] text-muted-foreground"
                  >
                    Mazaj
                  </motion.span>

                  <motion.button
                    onClick={onClose}
                    aria-label="Close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{
                      opacity: phase === "emptying" ? 0 : 1,
                      rotate: phase === "emptying" ? -90 : 0,
                    }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{
                      duration: 0.14 * slow,
                      ease: EASE,
                      delay: open ? shapeMs * 0.5 : 0.05 * slow,
                    }}
                    className="ml-auto grid size-6 place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
                  >
                    <X className="size-[14px]" />
                  </motion.button>
                </header>

                <div className="min-h-0 flex-1">{children}</div>
              </motion.div>
            ) : phase === "shrinking" || phase === "shut" ? (
              <motion.button
                key="shut"
                data-island-trigger
                onClick={onOpen}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="flex size-full items-center justify-center gap-2 px-4"
              >
                {/* The dot and the line arrive together, as one
                    group, so neither can move without the other.
                    The shape has already finished, so nothing
                    resizes underneath them. */}
                {/* The pair is centred at every width, so it
                    rides the shrink rather than waiting for it.
                    It fades up as the shape starts collapsing
                    and is settled by the time it arrives. */}
                <motion.span
                  key={line.id}
                  className="flex items-center gap-2"
                  initial={still ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3 * slow,
                    delay: 0.1 * slow,
                    ease: [0.25, 0.8, 0.3, 1],
                  }}
                >
                  <LivingDot
                    tone={tone}
                    moment={moment?.kind ?? null}
                    /* static until the island has been home for
                       half a second */
                    idle={idle}
                  />
                  <Shimmer still={still}>
                    {/* leading-relaxed so the line box holds the
                        descenders of y and g, which a tight box
                        clips when the mask slides over it */}
                    <span data-line className="block leading-[1.4]">
                      <Ticker
                        line={
                          moment?.text
                            ? { id: `moment-${moment.kind}`, tone: "good", text: moment.text }
                            : line
                        }
                      />
                    </span>
                  </Shimmer>
                </motion.span>
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>


      </motion.div>
    </div>
  );
}

/**
 * The occasional colour.
 *
 * Every twelve seconds a soft gradient drifts across whatever is
 * inside, then settles back to plain. It is the only moment the
 * closed island is anything but calm, which is what makes it
 * worth noticing.
 */
function Shimmer({
  children, still,
}: {
  children: React.ReactNode;
  still: boolean | null;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (still) return;
    const t = setInterval(() => {
      setOn(true);
      setTimeout(() => setOn(false), 3200);
    }, 15000);
    return () => clearInterval(t);
  }, [still]);

  return (
    <span className="relative block">
      {children}
      <AnimatePresence>
        {on ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(100deg, transparent 20%, var(--hue-teal) 35%, var(--hue-indigo) 45%, var(--hue-purple) 55%, var(--hue-pink) 65%, transparent 80%)",
              backgroundSize: "260% 100%",
            }}
            initial={{ opacity: 0, backgroundPosition: "140% 0%" }}
            animate={{ opacity: 0.55, backgroundPosition: "-40% 0%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.2, ease: "easeInOut" }}
          >
            {children}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

