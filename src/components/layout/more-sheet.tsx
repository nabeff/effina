"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MORE_TABS, TABS } from "@/lib/nav";

/** Everything that does not earn a permanent phone slot. */
export function MoreSheet({
  open, onOpenChange, overCount = 0,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  overCount?: number;
}) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[20px]">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col pb-[env(safe-area-inset-bottom)]">
          {MORE_TABS.map((id) => {
            const t = TABS.find((x) => x.id === id)!;
            const Icon = t.icon;
            return (
              <Link
                key={id}
                href={t.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 px-5 py-3 active:bg-fill-2"
              >
                <Icon className="size-[21px] text-muted-foreground" />
                <span className="flex-1 text-[15px] font-medium">{t.name}</span>
                {id === "rebal" && overCount > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                    {overCount}
                  </span>
                ) : null}
                <ChevronRight className="size-4 text-subtle-foreground" />
              </Link>
            );
          })}

          <button
            onClick={async () => {
              onOpenChange(false);
              await createClient().auth.signOut();
              router.push("/sign-in");
              router.refresh();
            }}
            className="flex items-center gap-3 border-t border-border-soft px-5 py-3 text-left text-destructive active:bg-destructive/10"
          >
            <LogOut className="size-[21px]" />
            <span className="flex-1 text-[15px] font-medium">Sign out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
