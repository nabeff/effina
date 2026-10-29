"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Monitor, Moon, Settings2, Sun } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { Mark } from "@/components/ui/mark";
import { useProfile } from "@/lib/hooks/use-profile";
import { useBudget, useBudgetMutation } from "@/lib/hooks/use-budget";
import { updateSettings } from "@/lib/supabase/mutations";
import { cn } from "@/lib/utils";

/**
 * The avatar, where people look for the way out.
 *
 * Signing out was at the bottom of Setup, which is the one place
 * nobody thinks to look for it.
 */
const THEMES = [
  { id: "dark", name: "Dark", icon: Moon },
  { id: "light", name: "Light", icon: Sun },
  { id: "system", name: "Auto", icon: Monitor },
] as const;

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /* a photo that fails to load falls back to the initials rather
     than leaving a broken image in the rail */
  const [brokenPhoto, setBrokenPhoto] = useState(false);
  const router = useRouter();
  const profile = useProfile();
  const { data } = useBudget();
  const save = useBudgetMutation((theme: string, { supabase, userId }) =>
    updateSettings(supabase, userId, { theme }),
  );
  const theme = data?.settings.theme ?? "dark";
  const setTheme = (t: string) => save.mutate(t);

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
            className="grid size-9 place-items-center overflow-hidden rounded-full bg-primary text-[12px] font-bold tracking-[-0.02em] text-primary-foreground transition-transform active:scale-[0.94]"
          >
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
            ) : profile ? (
              initials
            ) : (
              /* the mark until we know who is signed in, rather
                 than two letters that might be wrong */
              <Mark className="size-[56%]" colour />
            )}
          </button>
        }
      />

      <PopoverContent
        align="start"
        side="right"
        sideOffset={10}
        className="w-[248px] overflow-hidden rounded-[var(--radius-lg)] p-1.5"
      >
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="grid size-10 flex-none place-items-center overflow-hidden rounded-full bg-primary text-[12.5px] font-bold text-primary-foreground">
            {photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photo}
                alt=""
                width={40}
                height={40}
                referrerPolicy="no-referrer"
                onError={() => setBrokenPhoto(true)}
                className="size-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
              {profile?.name || "Your account"}
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {profile?.email || "Signed in"}
            </div>
          </div>
        </div>

        <div className="mx-1 my-1 h-px bg-border-soft" />

        <Link
          href="/setup"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-[13.5px] transition-colors outline-none hover:bg-fill-2 focus-visible:bg-fill-2"
        >
          <Settings2 className="size-[17px] text-muted-foreground" />
          Settings
        </Link>

        {/* theme, as three choices rather than a switch, because
            following the system is a real answer */}
        <div className="px-2.5 pt-2 pb-1">
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.03em] text-muted-foreground uppercase">
            Theme
          </div>
          <div className="flex gap-1 rounded-full bg-fill-2 p-0.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-full py-1 text-[11.5px] transition-colors",
                  theme === t.id
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-[13px]" />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-1 my-1 h-px bg-border-soft" />

        <button
          onClick={signOut}
          disabled={busy}
          className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-[13.5px] text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="size-[17px]" />
          {busy ? "Signing out" : "Sign out"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
