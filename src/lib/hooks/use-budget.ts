"use client";

/**
 * The budget, cached once and shared by every screen.
 *
 * One query holds the whole thing, because the math is pure and
 * synchronous: once the data is here, every figure on every
 * screen is a function call rather than another round trip.
 */

import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchBudget } from "@/lib/supabase/queries";
import { stats, thisMonth } from "@/lib/budget";
import type { BudgetData, MonthStats } from "@/types/budget";

export const BUDGET_KEY = ["budget"] as const;

export function useBudget() {
  const supabase = useMemo(() => createClient(), []);

  return useQuery({
    queryKey: BUDGET_KEY,
    queryFn: async (): Promise<BudgetData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      return fetchBudget(supabase, user.id);
    },
    staleTime: 30_000,
  });
}

/**
 * Pass this while a component has not mounted yet. Today differs
 * between the build and the browser, so a prerender must not read
 * it or it bakes a stale month into the HTML.
 */
export const SKIP = "__skip__";

/** The month on screen, computed from whatever is cached. */
export function useMonth(month?: string): {
  data: BudgetData | undefined;
  stats: MonthStats | null;
  isLoading: boolean;
} {
  const query = useBudget();

  const computed = useMemo(() => {
    if (!query.data || month === SKIP) return null;
    return stats(query.data, month ?? thisMonth());
  }, [query.data, month]);

  return { data: query.data, stats: computed, isLoading: query.isLoading };
}

/**
 * Any write. The budget is refetched afterwards rather than
 * patched by hand, because the math derives everything from the
 * same data and a half updated cache would show wrong figures.
 */
export function useBudgetMutation<TArgs>(
  fn: (args: TArgs, ctx: { userId: string; supabase: ReturnType<typeof createClient> }) => Promise<unknown>,
) {
  const supabase = useMemo(() => createClient(), []);
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (args: TArgs) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      return fn(args, { userId: user.id, supabase });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: BUDGET_KEY }),
  });
}
