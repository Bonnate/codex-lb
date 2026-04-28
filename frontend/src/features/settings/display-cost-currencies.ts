/** ISO codes allowed for dashboard cost display (aligned with backend allowlist). */
export const DISPLAY_COST_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "KRW",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "TRY",
  "BRL",
  "MXN",
  "SGD",
  "HKD",
] as const;

export type DisplayCostCurrencyCode = (typeof DISPLAY_COST_CURRENCY_CODES)[number];

export const DISPLAY_COST_CURRENCY_OPTIONS: { value: DisplayCostCurrencyCode; label: string }[] =
  DISPLAY_COST_CURRENCY_CODES.map((code) => ({ value: code, label: code }));
