"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MarkBadge } from "@/components/ui/mark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Google will not allow its mark to be recoloured, so it is drawn as is. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.5z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.8C8 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.8H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.8z" />
      <path fill="#EA4335" d="M24 10.5c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 3.9 30 2 24 2 15.4 2 8 7 4.5 14.1l7.3 5.8c1.7-5.2 6.5-9.4 12.2-9.4z" />
    </svg>
  );
}

/**
 * One form for both signing in and creating an account, because
 * asking which you want before asking for an email is a question
 * most people cannot answer.
 */
export default function SignInPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /* read straight off the address rather than through
     useSearchParams, which would need a Suspense boundary just to
     prerender a page that has no other dynamic part */
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(() => {
    if (typeof window === "undefined") return null;
    const e = new URLSearchParams(window.location.search).get("error");
    return e ? { text: e, bad: true } : null;
  });
  const [busy, setBusy] = useState(false);

  /* Supabase errors are written for developers, so they are
     turned into something a person can act on. */
  function friendly(err: unknown): string {
    const m = String((err as Error)?.message ?? "").toLowerCase();
    if (m.includes("invalid login")) return "That email and password do not match.";
    if (m.includes("already registered")) return "That email already has an account. Sign in instead.";
    if (m.includes("not confirmed") || m.includes("confirm")) return "Confirm the account from your email first.";
    if (m.includes("password")) return "Use at least 8 characters.";
    if (m.includes("email")) return "Check the email address.";
    if (m.includes("fetch") || m.includes("network")) return "No connection. Try again in a moment.";
    return "Could not do that. Try again.";
  }

  /**
   * Google sends the browser away and brings it back to the
   * callback, which swaps the code for a session. Nothing is
   * stored here, so there is no password to lose.
   */
  async function google() {
    setBusy(true);
    setMessage({ text: "Opening Google", bad: false });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setBusy(false);
      const m = String((err as Error)?.message ?? "").toLowerCase();
      setMessage({
        text: m.includes("provider") || m.includes("not enabled")
          ? "Google sign in is not switched on for this app yet."
          : friendly(err),
        bad: true,
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim();

    if (!mail.includes("@")) return setMessage({ text: "Enter the email you use.", bad: true });
    if (mode === "up" && password.length < 8)
      return setMessage({ text: "Use at least 8 characters.", bad: true });
    if (!password) return setMessage({ text: "Enter your password.", bad: true });

    setBusy(true);
    setMessage({ text: mode === "up" ? "Creating your account" : "Signing in", bad: false });

    try {
      const { error } =
        mode === "up"
          ? await supabase.auth.signUp({ email: mail, password })
          : await supabase.auth.signInWithPassword({ email: mail, password });

      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (err) {
      setBusy(false);
      setMessage({ text: friendly(err), bad: true });
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center p-5">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 text-center">
          <MarkBadge className="mx-auto mb-4 size-14" />
          <h1 className="text-2xl font-bold tracking-[-0.028em]">Nabil Effina</h1>
          <p className="mx-auto mt-1.5 max-w-[34ch] text-[14.5px] leading-relaxed text-muted-foreground">
            Bills come out first, then whatever is left is split into envelopes
            so every dirham has a job.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-[var(--radius)] bg-card p-5">
          <div className="mb-4 flex gap-0.5 rounded-[9px] bg-fill-2 p-0.5">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setMessage(null); }}
                className={cn(
                  "flex-1 rounded-[7px] px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
                  mode === m ? "bg-elevated text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {m === "in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={google}
            className="mb-4 h-11 w-full"
          >
            <GoogleMark />
            Continue with Google
          </Button>

          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-soft" />
            <span className="text-[11.5px] font-medium tracking-[0.03em] text-subtle-foreground uppercase">
              or
            </span>
            <span className="h-px flex-1 bg-border-soft" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" inputMode="email" autoComplete="email"
              placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password" type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              placeholder={mode === "up" ? "At least 8 characters" : "Your password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message ? (
            <div
              className={cn(
                "mt-3.5 rounded-[11px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                message.bad
                  ? "bg-destructive/10 text-destructive"
                  : "bg-fill-2 text-muted-foreground",
              )}
            >
              {message.text}
            </div>
          ) : null}

          <Button type="submit" disabled={busy} className="mt-4 h-11 w-full">
            {mode === "up" ? "Create account" : "Sign in"}
          </Button>

          <p className="mt-3.5 text-center text-xs leading-relaxed text-subtle-foreground">
            {mode === "up"
              ? "Your budget is kept in your account, so a lost phone is not a lost budget."
              : "Signing in pulls whatever is newest, here or in your account."}
          </p>
        </form>
      </div>
    </main>
  );
}
