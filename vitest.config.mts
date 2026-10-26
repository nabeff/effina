import { defineConfig } from "vitest/config";

/**
 * The money math is pure TypeScript with no JSX and no DOM, so the
 * tests need nothing but path resolution, which Vite now does
 * natively from tsconfig. Keeping it this light is what makes the
 * engine testable without a browser or a database.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
