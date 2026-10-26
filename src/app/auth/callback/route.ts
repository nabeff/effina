import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Where Google sends the browser back to. The code in the query
 * is swapped for a real session here, on the server, so the
 * token never passes through the page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const failed = searchParams.get("error_description") ?? searchParams.get("error");

  if (failed) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(failed)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  let response = NextResponse.redirect(`${origin}/`);

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
          response = NextResponse.redirect(`${origin}/`);
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("Could not finish signing in")}`,
    );
  }

  return response;
}
