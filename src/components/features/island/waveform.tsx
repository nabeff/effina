"use client";

import { motion } from "framer-motion";

/**
 * The bars that move while you speak.
 *
 * Not a real reading of the microphone. A true waveform needs an
 * analyser node and a frame loop, which costs battery for a thing
 * whose only job is to say the island is listening. These move on
 * their own, at speeds that look like speech.
 */

const BARS = [0.45, 0.8, 1, 0.65, 0.9, 0.5, 0.75];

export function Waveform() {
  return (
    <span className="flex h-4 flex-none items-center gap-[2.5px]">
      {BARS.map((h, i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full bg-destructive"
          animate={{ height: [`${h * 30}%`, "100%", `${h * 40}%`] }}
          transition={{
            duration: 0.5 + (i % 3) * 0.14,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
            delay: i * 0.055,
          }}
        />
      ))}
    </span>
  );
}
