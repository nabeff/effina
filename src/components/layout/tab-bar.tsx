"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, WalletCards, Target, Plus, Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { MORE_TABS, TABS } from "@/lib/nav";

/**
 * The phone bar. Five slots, and Add opens the sheet rather than
 * navigating, because logging is the thing done most often.
 */
export function TabBar({
  overCount = 0,
  onAdd,
  onMore,
}: {
  overCount?: number;
  onAdd: () => void;
  onMore: () => void;
}) {
  const path = usePathname();
  const inMore = MORE_TABS.some((id) => TABS.find((t) => t.id === id)?.href === path);

  const item = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-0.5 rounded-3xl px-0.5 py-2 text-[10px] font-semibold transition-colors",
      active ? "bg-foreground text-background" : "text-muted-foreground",
    );

  return (
    <nav
      className="glass fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 flex gap-1 rounded-[30px] p-[7px] lg:hidden"
      aria-label="Sections"
    >
      <Link href="/" className={item(path === "/")}>
        <LayoutGrid className="size-[21px]" /> Home
      </Link>

      <button onClick={onAdd} className={cn(item(false), "text-primary")} aria-label="Add">
        <Plus className="size-[21px]" /> Add
      </button>

      <Link href="/envelopes" className={item(path === "/envelopes")}>
        <WalletCards className="size-[21px]" /> Wallet
      </Link>

      <Link href="/goals" className={item(path === "/goals")}>
        <Target className="size-[21px]" /> Goals
      </Link>

      <button onClick={onMore} className={cn(item(inMore), "relative")}>
        <Ellipsis className="size-[21px]" /> More
        {overCount > 0 ? (
          <span className="absolute top-1.5 right-1/4 size-2 rounded-full bg-destructive" />
        ) : null}
      </button>
    </nav>
  );
}
