"use client";

import { usePathname } from "next/navigation";
import { TABS } from "@/lib/nav";

export function TopBar() {
  const path = usePathname();
  const current = TABS.find((t) => t.href === path) ?? TABS[0];

  return (
    <header className="sticky top-0 z-40 px-5 pt-3">
      <div className="glass mx-auto flex h-14 w-full max-w-[1460px] items-center gap-3 rounded-[20px] pr-2 pl-[18px]">
        <h1 className="text-[17px] font-bold tracking-[-0.026em]">{current.name}</h1>
      </div>
    </header>
  );
}
