"use client";

import { useEffect, useRef } from "react";

/**
 * The one burst in the whole app.
 *
 * Canvas, not elements, because a hundred divs with transforms
 * will drop frames on a phone and this is the last thing anybody
 * sees before the dashboard.
 *
 * The pieces take the envelope hues, so even the celebration is
 * made of the same colours as the budget.
 */

const HUES = [
  "--hue-green", "--hue-teal", "--hue-indigo", "--hue-purple",
  "--hue-pink", "--hue-orange", "--hue-yellow", "--hue-mint",
];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  spin: number;
  turn: number;
  color: string;
}

export function Confetti({ run }: { run: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!run) return;
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    /* the hues are CSS variables, so they have to be read from
       the document rather than guessed */
    const styles = getComputedStyle(document.documentElement);
    const colors = HUES.map((v) => styles.getPropertyValue(v).trim() || "#30d158");

    /* two fountains, left and right, the way a real popper goes */
    const pieces: Piece[] = [];
    const make = (fromX: number, lean: number) => {
      for (let i = 0; i < 52; i++) {
        const speed = 11 + Math.random() * 13;
        const angle = -Math.PI / 2 + lean + (Math.random() - 0.5) * 0.9;
        pieces.push({
          x: fromX,
          y: h * 0.42,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 5 + Math.random() * 5,
          h: 8 + Math.random() * 6,
          spin: Math.random() * Math.PI,
          turn: (Math.random() - 0.5) * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };
    make(w * 0.14, 0.5);
    make(w * 0.86, -0.5);

    let raf = 0;
    let frame = 0;

    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      for (const p of pieces) {
        p.vy += 0.34;        /* gravity */
        p.vx *= 0.992;       /* air */
        p.vy *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.spin += p.turn;

        /* they fade out rather than vanishing at the edge */
        const life = Math.max(0, Math.min(1, (210 - frame) / 60));
        if (life <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.globalAlpha = life;
        ctx.fillStyle = p.color;
        /* a slip of paper turns edge on as it spins */
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.spin)));
        ctx.restore();
      }

      if (frame < 210) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 size-full"
    />
  );
}
