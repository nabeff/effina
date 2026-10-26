import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * The money math is pure TypeScript with no JSX and no DOM, so the
 * tests need nothing but a path resolver. Keeping it that way is what
 * makes the engine testable without a browser or a database.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
