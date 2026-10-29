"use client";

import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { useRouter } from "next/navigation";
import { HEAD_H, Notch, type Tone } from "./notch";
import { Agent } from "./agent";
import { useReducedMotion } from "framer-motion";
import { useMoments } from "@/lib/hooks/use-moments";
import {
  idleRotation, type Line, type Moment, type Signal,
} from "@/lib/budget";

/**
 * Mazaj Island.
 *
 * The one element at the top of every screen that says what
 * matters about your money right now, and opens into the
 * assistant when you ask it to.
 *
 * The shape and its light live in Notch. This decides what it
 * says, how wide it should be, and when it opens.
 */

const MAX_W = 420;
/** how long one idle line holds before the next */
const ROTATE = 5200;

function toneOf(s?: Signal): Tone {
  if (!s) return "good";
  if (s.tone === "bad") return "bad";
  if (s.tone === "warn") return "warn";
  return "good";
}

export function Island({
  signals: all,
  currency,
  shutHeight,
  maxWidth,
  line,
  onReady,
}: {
  signals: Signal[];
  currency: string;
  /** the header's current height, so the two share a centre */
  shutHeight?: number;
  /** the most it may take without reaching either side */
  maxWidth?: number;
  /** what the closed island should say */
  line?: Line;
  /** hands the moment player out, so a dev panel can drive it */
  onReady?: (play: (m: Moment) => boolean) => void;
}) {
  const still = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  /* an unsent line survives a close, because losing what
     somebody typed is the rudest thing a panel can do */
  const [draft, setDraft] = useState("");
  const [scrollAt, setScrollAt] = useState(0);
  const [bodyH, setBodyH] = useState(160);
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(900);
  const router = useRouter();

  const rotation = useMemo(() => idleRotation(all), [all]);
  const current = rotation[at % Math.max(1, rotation.length)] ?? rotation[0];

  /* the moments, which are off entirely for anybody who has
     asked for less motion */
  const { moment, play } = useMoments({ enabled: !still });

  /* the line changes gently while it is closed, and holds still
     the moment it is opened, because a line that moves while you
     are reading it is the opposite of calm */
  useEffect(() => {
    if (open || rotation.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAt((n) => n + 1), ROTATE);
    return () => clearInterval(t);
  }, [open, rotation.length]);

  useEffect(() => {
    const read = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  /* the open height is whatever the panel's content needs. The
     body only exists once the panel has mounted, so a callback
     ref catches it the moment it appears. */
  useLayoutEffect(() => {
    if (!body) return;
    const read = () => setBodyH(body.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(body);
    const mo = new MutationObserver(read);
    mo.observe(body, { childList: true, subtree: true, attributes: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [body]);

  /* Anything can ask the island to open or close by firing
     this, which is how the tour can show the panel without the
     header needing to know the tour exists. */
  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen((e as CustomEvent<boolean>).detail !== false);
    };
    window.addEventListener("mazaj:island", onAsk);
    return () => window.removeEventListener("mazaj:island", onAsk);
  }, []);

  /* Every way out runs the same close. Escape, the X, a click
     outside and the header all call one function, so none of
     them can drift into its own behaviour. */
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  /* a click anywhere else closes it */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    /* on the next frame, so the click that opened it does not
       immediately close it again */
    const t = setTimeout(
      () => document.addEventListener("mousedown", onDown),
      0,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  /* Focus comes back to the island once it is shut, so somebody
     on a keyboard is not left on a button that no longer
     exists. */
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      box.current
        ?.querySelector<HTMLButtonElement>("[data-island-trigger]")
        ?.focus({ preventScroll: true });
    }, 600);
    return () => clearTimeout(t);
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  /* Never taller than three fifths of the screen, so the input
     is always on screen and reachable. The messages scroll
     inside what is left. */
  const maxH = Math.round(vh * 0.6);
  /* the slot the header gives it, which already excludes both
     sides and their gaps */
  const room = Math.min(MAX_W, maxWidth ?? Infinity, vw - 40);

  /* the line to show, from the caller or from the signal */
  const shown: Line = line ?? {
    id: current?.id ?? "calm",
    tone: current?.tone ?? "good",
    text: current?.line ?? "All good today",
  };

  useEffect(() => {
    onReady?.(play);
  }, [onReady, play]);

  return (
    <div ref={box} className="contents">
    <Notch
      tone={toneOf(current)}
      open={open}
      width={room}
      height={Math.min(bodyH + HEAD_H, maxH)}
      line={shown}
      moment={moment}
      shutHeight={shutHeight}
      onOpen={() => setOpen(true)}
      onClose={close}
    >
      <div ref={setBody}>
        <Agent
          signals={all}
          currency={currency}
          draft={draft}
          onDraft={setDraft}
          scrollAt={scrollAt}
          onScrollAt={setScrollAt}
          /* what the messages may use, once the header and the
             input row have taken theirs */
          maxBodyH={maxH - HEAD_H * 2 - 14}
          onClose={close}
          onGo={go}
        />
      </div>
    </Notch>
    </div>
  );
}
