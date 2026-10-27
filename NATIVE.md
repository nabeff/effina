# The phone apps

Capacitor wraps the deployed site rather than bundling it.

This is a Next server app: the auth callback, the proxy and the
Supabase session all need a server, and a static export would drop
them. So `capacitor.config.ts` points the web view at
https://effina.vercel.app and the native shell supplies what a
browser tab cannot: a home screen icon, the native status bar, a
splash screen, haptics, and a path to the App Store.

The web app stays the single source of truth. Shipping a fix means
deploying to Vercel, not resubmitting to Apple.

## Running it

    npx cap sync          # after any dependency change
    npx cap open ios      # opens Xcode
    npx cap open android  # opens Android Studio

iOS uses Swift Package Manager, not CocoaPods, so there is no
Podfile and no `pod install` step. The build target is
`ios/App/App.xcodeproj`, not a workspace.

## Icons and splash

Both are generated from one SVG:

    native-assets/icon-source.svg

To regenerate, write `native-assets/icon.png` (1024) and
`native-assets/splash.png` plus `splash-dark.png` (2732 square),
then run:

    npx @capacitor/assets generate --assetPath native-assets \
      --iconBackgroundColor '#000000' --splashBackgroundColor '#000000'

Watch two things afterwards. The generator rewrites
`public/manifest.webmanifest` with broken `../icons/` paths to webp
files it puts somewhere else, and it leaves a stray `icons/` folder
at the repo root. Revert the manifest and delete the folder:

    git checkout public/manifest.webmanifest
    rm -rf icons

## What the shell adds

`src/components/layout/native.tsx` loads every Capacitor module on
demand inside a try, so the browser build never pulls them in and a
missing plugin can never stop the web app rendering. It stamps
`data-native` on the root element, which is what the safe area
padding in `globals.css` keys off.

`tap()` in the same file is a short haptic, silent anywhere it is
not available, which includes every browser.

## The first build is slow, and looks stuck

`xcodebuild` sits on "Resolve Package Graph" for a long time on a
clean checkout, printing nothing. It is not hung. Capacitor ships
its Capacitor and Cordova frameworks as binary xcframework zips,
and that line is covering the download.

To watch it rather than guess, resolve the packages on their own
first, where the progress is visible:

    cd ios/App/CapApp-SPM
    swift package resolve

Then build from `ios/App`. The second build is fast, because the
artifacts are cached in the derived data folder.

## Before the App Store

- Set the bundle id and a real team in Xcode. It is currently
  `com.nabileffina.app`.
- Apple rejects apps that are only a wrapped website. The PWA
  behaviour, offline shell and haptics help, but expect to argue
  the case or add something genuinely native.
- `limitsNavigationsToAppBoundDomains` is on, so the web view will
  only navigate within the configured domain. Adding a new host,
  including an OAuth provider, means adding it to the app bound
  domains in `Info.plist`.
