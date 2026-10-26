/**
 * The server client. Reads the session from cookies so a page can
 * render with the user's data already in hand rather than
 * flashing empty and filling in.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            /* called from a Server Component, where the middleware
               has already refreshed the session, so this is safe
               to ignore */
          }
        },
      },
    },
  );
}
