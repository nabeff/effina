/**
 * Formatting. The currency label is a setting, so it is passed in
 * rather than reached for, which keeps these pure.
 */

export function money(n: number, currency = "DH"): string {
  return `${Math.round(n || 0).toLocaleString("en-US")} ${currency}`;
}

export function money0(n: number): string {
  return Math.round(n || 0).toLocaleString("en-US");
}

export function pct(n: number): string {
  return `${Math.round((n || 0) * 10) / 10}%`;
}

/** 1st, 2nd, 3rd. Used for bill due days. */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return n + (["th", "st", "nd", "rd"][n % 10] ?? "th");
}
