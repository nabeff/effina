/**
 * The browser client. The anon key only ever grants what row
 * level security allows, which is each user's own rows, so it is
 * safe in client code. The service role key never appears here.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
