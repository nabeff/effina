"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TABS } from "@/lib/nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The desktop rail. Icons only, because nine labels would crowd
 * the screen and the tooltip covers the one case where the icon
 * is not obvious.
 */
export function Sidebar({ overCount = 0 }: { overCount?: number }) {
  const path = usePathname();

  return (
    <aside className="glass fixed top-1/2 left-4 z-50 hidden w-[70px] -translate-y-1/2 flex-col items-center gap-1.5 rounded-[30px] py-4 lg:flex">
      <nav className="flex flex-col items-center gap-1.5">
        {TABS.map((t) => {
          const active = path === t.href;
          const Icon = t.icon;
          return (
            <Tooltip key={t.id}>
              {/* shadcn ships Base UI now, which composes with render
                  rather than asChild */}
              <TooltipTrigger
                render={
                  <Link
                    href={t.href}
                    aria-label={t.name}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative grid size-11 place-items-center rounded-full text-muted-foreground transition-colors",
                      "hover:bg-fill-2 hover:text-foreground active:scale-[0.93]",
                      active && "bg-foreground text-background hover:bg-foreground hover:text-background",
                    )}
                  >
                    <Icon className="size-5" />
                    {t.id === "rebal" && overCount > 0 ? (
                      <span className="absolute -top-px -right-px grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white tabular">
                        {overCount}
                      </span>
                    ) : null}
                  </Link>
                }
              />
              <TooltipContent side="right">{t.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
