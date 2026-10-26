"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SerwistProvider } from "@serwist/next/react";

export function Providers({ children }: { children: React.ReactNode }) {
  /* created once per browser session, not once per render */
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SerwistProvider
      swUrl="/sw.js"
      /* in development there is no generated worker, and one
         caching a stale build looks like the app ignoring edits */
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline
    >
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SerwistProvider>
  );
}
