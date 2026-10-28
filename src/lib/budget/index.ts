/**
 * The money engine.
 *
 * Every function here is pure: it takes data and returns numbers,
 * with no React, no Supabase and no DOM. That is what makes it
 * testable without a browser and what keeps the app working
 * offline. The database stores facts, this computes meaning.
 */

export * from "./timing";
export * from "./stats";
export * from "./split";
export * from "./goals";
export * from "./tax";
export * from "./rebalance";
export * from "./notices";
export * from "./onboarding";
export * from "./dashboard";
export * from "./layout";
export * from "./trends";
export * from "./areas";
