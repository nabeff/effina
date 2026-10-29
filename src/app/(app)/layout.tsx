"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TabBar } from "@/components/layout/tab-bar";
import { TopBar } from "@/components/layout/top-bar";
import { MoreSheet } from "@/components/layout/more-sheet";
import { Appearance } from "@/components/layout/appearance";
import { Native } from "@/components/layout/native";
import { AddSheet } from "@/components/features/transactions/add-sheet";
import { OnboardingGate } from "@/components/features/onboarding/gate";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";
import { ShellProvider } from "@/lib/hooks/use-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <Shell>{children}</Shell>
    </ShellProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  /* Every page opens at its top. Next preserves the scroll
     position across routes, which means arriving at a new page
     halfway down it is the default rather than the exception.
     This runs after the new page has rendered, so nothing can
     scroll back over it. */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [path]);

  const [moreOpen, setMoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  /* The month depends on today, which differs between the build
     and the browser, so it is only read once mounted. Reading it
     during prerender would bake a stale month into the HTML. */
  const mounted = useMounted();

  const { stats } = useMonth(mounted ? undefined : SKIP);
  const overCount = mounted ? stats?.over.length ?? 0 : 0;

  return (
    <div className="min-h-dvh">
      <Appearance />
      <Native />
      <Sidebar overCount={overCount} />

      <div className="lg:pl-[102px]">
        <TopBar />
        <main className="mx-auto w-full max-w-[1460px] px-5 pt-6 pb-[calc(7.75rem+env(safe-area-inset-bottom))] lg:pb-12">
          {children}
        </main>
      </div>

      <TabBar
        overCount={overCount}
        onAdd={() => setAddOpen(true)}
        onMore={() => setMoreOpen(true)}
      />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} overCount={overCount} />
      <AddSheet open={addOpen} onOpenChange={setAddOpen} />
      {mounted ? <OnboardingGate /> : null}
    </div>
  );
}
