"use client";

import { usePathname } from "next/navigation";
import { TABS } from "@/lib/nav";
import { NoticeBell } from "./notice-bell";
import { useMounted } from "@/lib/hooks/use-mounted";

export function TopBar() {
  const path = usePathname();
  const mounted = useMounted();
  const current = TABS.find((t) => t.href === path) ?? TABS[0];

  return (
    /* the padding sits inside the max width, exactly as it does on
       main, so the bar and the page share both edges. Outside it,
       the bar was 1460 wide where the page was 1420. */
    <header className="sticky top-0 z-40 mx-auto w-full max-w-[1460px] px-5 pt-3">
      <div className="glass flex h-14 w-full items-center gap-3 rounded-[20px] pr-2 pl-[18px]">
        <h1 className="text-[17px] font-bold tracking-[-0.026em]">{current.name}</h1>
        <div className="ml-auto">
          <NoticeBell mounted={mounted} />
        </div>
      </div>
    </header>
  );
}
