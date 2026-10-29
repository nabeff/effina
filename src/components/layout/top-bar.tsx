"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Search } from "lucide-react";
import { NoticeBell } from "./notice-bell";
import { AccountMenu } from "./account-menu";
import { MonthSwitcher } from "./header/month-switcher";
import { AddMenu } from "./header/add-menu";
import { Mark } from "@/components/ui/mark";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Island } from "@/components/features/island/island";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useShell } from "@/lib/hooks/use-shell";
import { useMonth, SKIP } from "@/lib/hooks/use-budget";
import { signals } from "@/lib/budget";
import { cn } from "@/lib/utils";

/**
 * The header.
 *
 * Who you are on the left, what matters now in the middle, what
 * you reach for on the right. The island is the only part that
 * carries information rather than navigation, so it keeps the
 * centre at every size and everything else gives way around it.
 */
export function TopBar() {
  const mounted = useMounted();
  const { month, priv, togglePriv } = useShell();
  const { data, stats: st } = useMonth(mounted ? month : SKIP);
  const [scrolled, setScrolled] = useState(false);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const [sides, setSides] = useState({ left: 240, right: 320 });
  const [barW, setBarW] = useState(1420);

  /* both halves are measured, so the island's room is what is
     actually free rather than a number that drifts when a
     month name or an icon changes */
  useEffect(() => {
    const read = () => {
      setSides({
        left: left.current?.offsetWidth ?? 240,
        right: right.current?.offsetWidth ?? 320,
      });
    };
    const readBar = () => setBarW(slot.current?.offsetWidth ?? 1420);
    const ro = new ResizeObserver(() => {
      read();
      readBar();
    });
    if (left.current) ro.observe(left.current);
    if (right.current) ro.observe(right.current);
    if (slot.current) ro.observe(slot.current);
    return () => ro.disconnect();
  }, []);

  const leftW = sides.left;
  const rightW = sides.right;

  const all = useMemo(() => {
    if (!data || !st) return [];
    return signals(data, st, { currency: data.settings.currency });
  }, [data, st]);

  /* the bar tightens as the page moves under it, so it takes
     less room once you are reading rather than arriving */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full">
      <motion.div
        animate={{ height: scrolled ? 48 : 54 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={cn(
          "relative mx-auto flex w-full max-w-[1460px] items-center gap-3 px-5",
          /* always transparent. The page runs under the header
             and nothing is laid over it. */
          "bg-transparent",
        )}
      >
        {/* who */}
        <div ref={left} className="flex flex-none items-center gap-2">
          <motion.div whileTap={{ scale: 0.94 }}>
            <Link href="/" aria-label="Mazaj" className="flex items-center gap-2 pr-1">
              <Mark className="size-[19px]" colour />
              <span className="hidden text-[14.5px] font-bold tracking-[-0.028em] sm:block">
                Mazaj
              </span>
            </Link>
          </motion.div>

          <div className="hidden md:block">
            <MonthSwitcher />
          </div>
        </div>

        {/* what matters now */}
        {/* The notch hangs from the screen's own top edge. Its
            box is the gap between the two sides of the bar, so
            it can never cover the month switcher or the search
            pill however long its line gets. */}
        <div
          ref={slot}
          /* Across the bar's own box, padding included, so its
             centre is the bar's centre and neither side can
             move it. */
          className="pointer-events-none absolute inset-0 flex justify-center pt-2"
        >
          {mounted ? (
            <Island
              signals={all}
              currency={data?.settings.currency ?? "DH"}
              shutHeight={scrolled ? 34 : 38}
              /* Centred, so the free space is twice the gap to
                 whichever side is nearer. Keeps it off both the
                 month switcher and the search pill. */
              maxWidth={Math.max(
                200,
                (Math.min(
                  (barW - leftW * 2) / 2,
                  (barW - rightW * 2) / 2,
                ) - 24) * 2,
              )}

            />
          ) : null}
        </div>

        {/* the space the notch occupies, so the two halves of
            the bar never slide under it */}
        <span aria-hidden className="min-w-0 flex-1" />

        {/* what you reach for */}
        <div ref={right} className="flex flex-none items-center gap-1.5">
          {/* search is a pill where there is room, an icon where
              there is not */}
          <Tooltip>
            <TooltipTrigger
              render={
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  aria-label="Search"
                  className="hidden h-9 items-center gap-2 rounded-full border border-hairline bg-card/60 pr-1.5 pl-3 text-muted-foreground transition-colors hover:border-hairline-strong hover:text-foreground lg:flex"
                >
                  <Search className="size-[15px]" />
                  <span className="text-[12.5px]">Search</span>
                  <Kbd>⌘K</Kbd>
                </motion.button>
              }
            />
            <TooltipContent side="bottom">Search</TooltipContent>
          </Tooltip>

          <IconButton label="Search" shortcut="⌘K" className="lg:hidden">
            <Search className="size-[18px]" />
          </IconButton>

          <AddMenu />

          <IconButton
            label={priv ? "Show amounts" : "Hide amounts"}
            onClick={togglePriv}
          >
            {priv ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </IconButton>

          <NoticeBell mounted={mounted} />
          <AccountMenu />
        </div>
      </motion.div>
    </header>
  );
}

function IconButton({
  label, shortcut, children, onClick, className,
}: {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <motion.button
            whileTap={{ scale: 0.92 }}
            aria-label={label}
            onClick={onClick}
            className={cn(
              "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground",
              className,
            )}
          >
            {children}
          </motion.button>
        }
      />
      <TooltipContent side="bottom" className="gap-2">
        {label}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}
