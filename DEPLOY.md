# Deploying

Live at https://effina.vercel.app

## Commands

    npm run dev        # Turbopack dev server
    npm run build      # next build, then the service worker
    npm test           # 55 assertions over the money engine
    npm run typecheck
    npm run lint
    npx vercel --prod --yes

## Environment

Two variables, both `NEXT_PUBLIC_`, so both ship in the browser
bundle by design. They are the project URL and the legacy anon
key, taken from the "Legacy anon, service_role API keys" tab in
Supabase, not the new publishable keys.

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY

Set on Vercel for Production and Development. Preview is still
missing them: CLI 52 loops on its own suggested command for that
target, so add them in the dashboard or upgrade the CLI first.

Row level security means the anon key alone reads nothing. Every
policy checks `auth.uid()`, so a signed out request returns no
rows rather than someone else's.

## The service worker

Serwist runs in configurator mode from `serwist.config.ts`, not
as a `next.config` wrapper. The wrapper does not support
Turbopack, which this project builds with, so it warned and
produced no worker at all.

The worker is written to `public/sw.js` and served from the root
so its scope covers every route. Under `.next/static` it built
happily and then served a 404.

`public/sw.js` is generated. It is gitignored and excluded from
lint.

## Google sign in

The button is in the app, but the provider has to be switched on
in the Supabase dashboard first, under Authentication, Providers,
Google. It needs a client id and secret from a Google Cloud OAuth
client, with these redirect URLs allowed:

    https://upeeszphvpxadryzafgi.supabase.co/auth/v1/callback

Until it is switched on the button says so rather than failing
silently.

## Test accounts

    neffina8+sync@gmail.com      the migrated budget
    neffina8+onboard@gmail.com   a fresh account, used to test setup

Delete the second one from Authentication, Users when it is no
longer wanted.

## After deploying

Check these, since each has broken before:

    /sw.js                   200, not 404
    /manifest.webmanifest    200
    /icons/icon-192.png      200
    /offline                 200, and not a redirect to sign in

The offline route skips the auth check in `src/proxy.ts`, because
being offline is exactly when a session cannot be verified.
