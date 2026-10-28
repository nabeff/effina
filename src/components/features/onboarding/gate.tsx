"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mark } from "@/components/ui/mark";
import { useQueryClient } from "@tanstack/react-query";
import { Wizard } from "./wizard";
import { Tour } from "./tour";
import { createClient } from "@/lib/supabase/client";
import { BUDGET_KEY, useBudget } from "@/lib/hooks/use-budget";
import { updateSettings } from "@/lib/supabase/mutations";

/**
 * Decides whether setup or the tour should be on screen.
 *
 * Both read their flag from settings, so "Run setup again" is
 * just that flag going false. Neither can appear before the
 * budget has loaded, because a wizard flashing over data that
 * was already there would be alarming.
 */
export function OnboardingGate() {
  const { data, isLoading } = useBudget();
  const client = useQueryClient();

  /* closing is local, so the sheet goes away at once rather than
     waiting on a round trip to the database */
  const [doneSetup, setDoneSetup] = useState(false);
  /* Once the wizard is on screen it owns the screen until it
     says otherwise. Its last job marks the account onboarded,
     which refetches the budget, which would otherwise unmount
     the wizard mid finish and drop the person on the dashboard
     before the animation had played. The wizard tells us when
     it has taken over, from an event rather than a render. */
  const [started, setStarted] = useState(false);
  const [doneTour, setDoneTour] = useState(false);

  /* Until the budget has loaded, nobody knows whether setup is
     owed. Returning nothing lets the dashboard paint its
     skeleton first, so a new account sees a flash of an empty
     dashboard before the wizard covers it. A plain hold keeps
     the first screen honest. */
  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <Mark className="size-[72px] text-subtle-foreground" />
        </motion.div>
      </div>
    );
  }

  const needsSetup = (!data.settings.onboarded || started) && !doneSetup;
  const needsTour = data.settings.onboarded && !data.settings.tourDone && !doneTour;

  async function finishTour() {
    setDoneTour(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await updateSettings(supabase, user.id, { tourDone: true });
      await client.invalidateQueries({ queryKey: BUDGET_KEY });
    } catch {
      /* a tour that will not mark itself done is not worth an error */
    }
  }

  if (needsSetup) {
    return (
      <Wizard
        currency={data.settings.currency}
        onStart={() => setStarted(true)}
        onClose={() => setDoneSetup(true)}
      />
    );
  }

  if (needsTour) return <Tour onClose={finishTour} />;

  return null;
}
