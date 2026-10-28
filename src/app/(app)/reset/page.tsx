"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BUDGET_KEY } from "@/lib/hooks/use-budget";
import { updateSettings } from "@/lib/supabase/mutations";

/**
 * Wipes this account back to the day it was made.
 *
 * It runs as the signed in person through the ordinary client,
 * so row level security still applies and it can only ever
 * reach their own rows. There is no way for this page to touch
 * anybody else's money.
 */

const TABLES = [
  "transfers",
  "closed_month_envelopes",
  "closed_months",
  "transactions",
  "goals",
  "bills",
  "envelopes",
] as const;

export default function Reset() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const router = useRouter();
  const client = useQueryClient();

  async function wipe() {
    setBusy(true);
    setLog([]);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      for (const table of TABLES) {
        const { error } = await supabase.from(table).delete().eq("user_id", user.id);
        /* a table this account never wrote to is not a failure */
        if (error && !/does not exist/i.test(error.message)) throw error;
        setLog((l) => [...l, `cleared ${table}`]);
      }

      /* the app's own writer, so the column names and the
         upsert behaviour stay in one place */
      await updateSettings(supabase, user.id, {
        income: 0,
        debtTotal: 0,
        debtPaidBefore: 0,
        taxPaid: {},
        doneMonths: {},
        onboarded: false,
        tourDone: false,
        layoutOrder: [],
        layoutWidths: {},
        layoutHidden: [],
      });
      setLog((l) => [...l, "cleared settings"]);

      /* the wizard keeps a half finished draft in the browser,
         which would otherwise survive the wipe */
      sessionStorage.removeItem("effina.setup.draft");
      sessionStorage.removeItem("effina.setup.step");

      await client.invalidateQueries({ queryKey: BUDGET_KEY });
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[460px] py-10">
      <h1 className="text-[22px] font-bold tracking-[-0.025em]">Reset this account</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
        Deletes every envelope, bill, goal and transaction on this account and
        clears your income and both setup flags. It cannot be undone, and it only
        ever touches the account you are signed in as.
      </p>

      {done ? (
        <div className="mt-6">
          <p className="text-[14px] text-primary">The account is blank.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Start setup
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive"
          className="mt-6"
          disabled={busy}
          onClick={wipe}
        >
          {busy ? "Clearing" : "Clear everything"}
        </Button>
      )}

      {log.length ? (
        <ul className="mt-5 space-y-1 text-[12.5px] text-muted-foreground">
          {log.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
