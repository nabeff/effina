"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TabBar } from "@/components/layout/tab-bar";
import { TopBar } from "@/components/layout/top-bar";
import { MoreSheet } from "@/components/layout/more-sheet";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);

  /* The month depends on today, which differs between the build
     and the browser, so it is only read once mounted. Reading it
     during prerender would bake a stale month into the HTML. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { stats } = useMonth(mounted ? undefined : SKIP);
  const overCount = mounted ? stats?.over.length ?? 0 : 0;

  return (
    <div className="min-h-dvh">
      <Sidebar overCount={overCount} />

      <div className="lg:pl-[102px]">
        <TopBar />
        <main className="mx-auto w-full max-w-[1460px] px-5 pt-6 pb-[calc(7.75rem+env(safe-area-inset-bottom))] lg:pb-12">
          {children}
        </main>
      </div>

      <TabBar
        overCount={overCount}
        onAdd={() => { /* wired to the add sheet in the next pass */ }}
        onMore={() => setMoreOpen(true)}
      />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} overCount={overCount} />
    </div>
  );
}
