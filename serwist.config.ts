import { serwist, generateGlobPatterns } from "@serwist/next/config";

/**
 * Configurator mode rather than the next.config wrapper, because
 * this project builds with Turbopack and the wrapper does not
 * support it, so it silently produced no service worker at all.
 *
 * The worker is written into public and served from the root, so
 * its scope covers every route. Written under .next/static it was
 * built happily and then served a 404.
 *
 * The glob patterns come from Serwist's own helper, which knows
 * Next serves its assets out of distDir/static. Writing the
 * pattern by hand produced an empty precache manifest that still
 * built without complaint.
 */
export default serwist.withNextConfig((nextConfig) => {
  const distDir = nextConfig.distDir.replace(/^\/|\/$/g, "");
  return {
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    globDirectory: ".",
    globPatterns: generateGlobPatterns(`${distDir}/`),
  };
});
