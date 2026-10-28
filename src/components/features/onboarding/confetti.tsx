"use client";

import { motion } from "framer-motion";

/**
 * The finish.
 *
 * Not confetti. A hundred paper rectangles tumbling across the
 * screen is a 2010 website, and it says nothing about what just
 * happened.
 *
 * Instead the mark lands, one ring opens out of it, and a few
 * motes of the envelope colours drift up and fade. Quiet, and
 * over in about a second, which is what a finish should be.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

const HUES = [
  "green", "teal", "indigo", "purple", "pink", "orange", "yellow", "mint",
];

/** where each mote starts and how far it drifts, fixed so the
    burst is the same every time rather than random noise */
const MOTES = [
  { x: -118, y: 16, d: 0, s: 1 },
  { x: 104, y: -28, d: 0.06, s: 0.8 },
  { x: -64, y: -74, d: 0.12, s: 0.9 },
  { x: 142, y: 44, d: 0.04, s: 0.7 },
  { x: -148, y: -40, d: 0.16, s: 0.75 },
  { x: 58, y: 86, d: 0.1, s: 0.85 },
  { x: -36, y: 104, d: 0.2, s: 0.65 },
  { x: 128, y: -82, d: 0.14, s: 0.8 },
];

export function Confetti({ run }: { run: boolean }) {
  if (!run) return null;

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {/* one ring, opening out of where the mark is */}
      {[0, 1].map((i) => (
        <motion.span
          key={`ring-${i}`}
          className="absolute size-[132px] rounded-full border border-primary/45"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 2.6], opacity: [0.7, 0] }}
          transition={{
            duration: 1.25,
            ease: [0.16, 0.9, 0.3, 1],
            delay: i * 0.18,
          }}
        />
      ))}

      {/* motes of the envelope colours, drifting out and up */}
      {MOTES.map((m, i) => (
        <motion.span
          key={`mote-${i}`}
          className="absolute rounded-full"
          style={{
            width: 7 * m.s,
            height: 7 * m.s,
            background: `var(--hue-${HUES[i % HUES.length]})`,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{
            x: m.x,
            y: [0, m.y - 26, m.y - 58],
            opacity: [0, 1, 0],
            scale: [0.3, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            ease: EASE,
            delay: 0.1 + m.d,
            times: [0, 0.4, 1],
          }}
        />
      ))}
    </div>
  );
}
