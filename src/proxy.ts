/**
 * Next 16 calls this a proxy rather than middleware.
 *
 * Keeps the session fresh and keeps signed out visitors out of
 * the app. Without this a token expires mid session and every
 * query starts failing with no explanation.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  /* A design bench holds no data, so it needs no account. It
     is not an auth route though: sending a signed in person
     away from it defeats the point of being able to look at
     it. */
  const isBench =
    path.startsWith("/notch-lab") || path.startsWith("/header-lab");

  const isAuthRoute = path.startsWith("/sign-in") || path.startsWith("/auth/");

  /* the offline fallback has to render with no session, since
     being offline is exactly when the session cannot be checked */
  if (path === "/offline") return response;

  /* An API route answers with a status, never with somebody
     else's HTML. Redirecting one to the sign in page makes every
     fetch look like a network failure to the caller, which is
     how the assistant came to say it could not be reached when
     the real answer was that nobody was signed in. */
  if (!user && path.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!user && !isAuthRoute && !isBench) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /* everything except static files and images */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
