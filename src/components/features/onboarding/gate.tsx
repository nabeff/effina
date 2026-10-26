"use client";

import { useState } from "react";
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
  const { data } = useBudget();
  const client = useQueryClient();

  /* closing is local, so the sheet goes away at once rather than
     waiting on a round trip to the database */
  const [doneSetup, setDoneSetup] = useState(false);
  const [doneTour, setDoneTour] = useState(false);

  if (!data) return null;

  const needsSetup = !data.settings.onboarded && !doneSetup;
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
        onClose={() => setDoneSetup(true)}
      />
    );
  }

  if (needsTour) return <Tour onClose={finishTour} />;

  return null;
}
