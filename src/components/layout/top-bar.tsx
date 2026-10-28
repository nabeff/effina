"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { TABS } from "@/lib/nav";
import { NoticeBell } from "./notice-bell";
import { AccountMenu } from "./account-menu";
import { Mark } from "@/components/ui/mark";
import { Island } from "@/components/features/island/island";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useMonth, SKIP } from "@/lib/hooks/use-budget";
import { signals } from "@/lib/budget";
import { cn } from "@/lib/utils";

/**
 * The header.
 *
 * Three parts, and the middle one is the point. The left says
 * where you are and who you are, the right is the few things you
 * reach for, and the island in the centre says the one thing
 * about your money that matters right now.
 *
 * On a narrow screen the island keeps the middle and everything
 * else gives way, because the island is the only part that
 * carries information rather than navigation.
 */
export function TopBar() {
  const path = usePathname();
  const mounted = useMounted();
  const current = TABS.find((t) => t.href === path) ?? TABS[0];
  const { data, stats: st } = useMonth(mounted ? undefined : SKIP);
  const [searchOpen, setSearchOpen] = useState(false);

  const all = useMemo(() => {
    if (!data || !st) return [];
    return signals(data, st, { currency: data.settings.currency });
  }, [data, st]);

  /* the date is read after mount, because a server rendering
     this page has no idea what day it is where you are */
  const today = useMemo(
    () =>
      mounted
        ? new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : "",
    [mounted],
  );

  return (
    <header className="sticky top-0 z-40 mx-auto w-full max-w-[1460px] px-5 pt-3">
      <div className="glass flex h-14 w-full items-center gap-3 rounded-[20px] pr-2 pl-3">
        {/* who and where */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            aria-label="Mazaj"
            className="grid size-9 flex-none place-items-center rounded-[11px] bg-card-2 transition-transform active:scale-95"
          >
            <Mark className="size-[17px]" colour />
          </Link>
          <div className="hidden min-w-0 sm:block">
            <h1 className="truncate text-[15px] leading-tight font-bold tracking-[-0.024em]">
              {current.name}
            </h1>
            <p className="truncate text-[11.5px] leading-tight text-muted-foreground">
              {today}
            </p>
          </div>
        </div>

        {/* the island, which keeps the middle on every size */}
        <div className="relative flex min-w-0 flex-1 items-start justify-center self-stretch pt-[8px]">
          {mounted && all.length ? (
            <Island signals={all} currency={data?.settings.currency ?? "DH"} />
          ) : (
            <span className="h-[38px]" />
          )}
        </div>

        {/* the few things you reach for */}
        <div className="flex flex-none items-center gap-0.5">
          <HeaderButton
            label="Search"
            onClick={() => setSearchOpen((s) => !s)}
            className={cn("hidden sm:grid", searchOpen && "bg-fill-2 text-foreground")}
          >
            <Search className="size-[17px]" />
          </HeaderButton>

          <HeaderButton label="Add" href="/log" className="hidden sm:grid">
            <Plus className="size-[19px]" />
          </HeaderButton>

          <NoticeBell mounted={mounted} />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function HeaderButton({
  label, children, href, onClick, className,
}: {
  label: string;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const style = cn(
    "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground",
    className,
  );

  if (href) {
    return (
      <motion.div whileTap={{ scale: 0.92 }}>
        <Link href={href} aria-label={label} className={style}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button whileTap={{ scale: 0.92 }} aria-label={label} onClick={onClick} className={style}>
      {children}
    </motion.button>
  );
}
