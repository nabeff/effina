"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings2 } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { Mark } from "@/components/ui/mark";
import { useProfile } from "@/lib/hooks/use-profile";

/**
 * The avatar, where people look for the way out.
 *
 * Signing out was at the bottom of Setup, which is the one place
 * nobody thinks to look for it.
 */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /* a photo that fails to load falls back to the initials rather
     than leaving a broken image in the rail */
  const [brokenPhoto, setBrokenPhoto] = useState(false);
  const router = useRouter();
  const profile = useProfile();

  const initials = profile?.initials ?? "NE";
  const photo = brokenPhoto ? null : profile?.avatar;

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
            aria-label={profile?.name ? `${profile.name}, your account` : "Your account"}
            className="grid size-11 place-items-center overflow-hidden rounded-full bg-primary text-[13px] font-bold tracking-[-0.02em] text-primary-foreground transition-transform active:scale-[0.94]"
          >
            {photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo}
                alt=""
                width={44}
                height={44}
                referrerPolicy="no-referrer"
                onError={() => setBrokenPhoto(true)}
                className="size-full object-cover"
              />
            ) : profile ? (
              initials
            ) : (
              /* the mark until we know who is signed in, rather
                 than two letters that might be wrong */
              <Mark className="size-[56%]" />
            )}
          </button>
        }
      />

      <PopoverContent align="start" side="right" className="w-[230px] p-0">
        <div className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
          <span className="grid size-9 flex-none place-items-center overflow-hidden rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
            {photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo}
                alt=""
                width={36}
                height={36}
                referrerPolicy="no-referrer"
                onError={() => setBrokenPhoto(true)}
                className="size-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
              {profile?.name || "Your account"}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {profile?.email || "Signed in"}
            </div>
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
