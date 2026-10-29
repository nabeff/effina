"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Text that arrives the way a reply actually arrives.
 *
 * One character at a time with a cursor behind it, because a
 * sentence that appears whole reads as a lookup and a sentence
 * that arrives reads as an answer.
 *
 * The full text is in the DOM from the start, transparent, so
 * the line never reflows as it fills and a screen reader hears
 * the whole thing rather than a stutter.
 */

const PER_CHAR = 15;

export function Typed({
  text,
  onDone,
  className,
}: {
  text: string;
  onDone?: () => void;
  className?: string;
}) {
  const still = useReducedMotion();
  /* keyed by the text, so a new sentence starts from nothing
     without the effect having to reset it */
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (still) {
      onDone?.();
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setAt(i);
      if (i >= text.length) {
        clearInterval(t);
        onDone?.();
      }
    }, PER_CHAR);
    return () => clearInterval(t);
    /* onDone is a fresh closure each render, and re-running on it
       would restart the typing every frame */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, still]);

  const done = at >= text.length;

  return (
    <span className={className}>
      {text.slice(0, at)}
      {!done ? (
        <>
          <span className="ml-[1px] inline-block h-[0.95em] w-[2px] translate-y-[2px] animate-pulse bg-foreground align-middle" />
          {/* the rest of the sentence, holding its own space, so
              the block never grows line by line as it fills */}
          <span aria-hidden className="opacity-0">
            {text.slice(at)}
          </span>
        </>
      ) : null}
    </span>
  );
}
