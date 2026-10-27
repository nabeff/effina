"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings2, User } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { useBudget } from "@/lib/hooks/use-budget";

/**
 * The avatar, where people look for the way out.
 *
 * Signing out was at the bottom of Setup, which is the one place
 * nobody thinks to look for it.
 */
export function AccountMenu({ initials = "NE" }: { initials?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { data } = useBudget();

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            aria-label="Your account"
            className="grid size-11 place-items-center rounded-full bg-primary text-[13px] font-bold tracking-[-0.02em] text-primary-foreground transition-transform active:scale-[0.94]"
          >
            {initials}
          </button>
        }
      />

      <PopoverContent align="start" side="right" className="w-[230px] p-0">
        <div className="border-b border-border-soft px-4 py-3">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            <User className="size-3.5 text-muted-foreground" />
            Your account
          </div>
          <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {data ? `Saved to your account` : "Loading"}
          </div>
        </div>

        <Link
          href="/setup"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] transition-colors hover:bg-fill-2"
        >
          <Settings2 className="size-4 text-muted-foreground" />
          Setup
        </Link>

        <button
          onClick={signOut}
          disabled={busy}
          className="flex w-full items-center gap-2.5 border-t border-border-soft px-4 py-2.5 text-left text-[13.5px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="size-4" />
          {busy ? "Signing out" : "Sign out"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
