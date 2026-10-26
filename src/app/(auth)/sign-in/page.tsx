"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
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
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            NE
          </div>
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
