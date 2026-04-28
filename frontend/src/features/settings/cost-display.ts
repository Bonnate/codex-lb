import type { DashboardSettings } from "@/features/settings/schemas";

export type CostDisplaySnapshot = {
  currency: string;
  rates: Record<string, number>;
};

let snapshot: CostDisplaySnapshot = {
  currency: "USD",
  rates: { USD: 1 },
};

export function applyCostDisplayFromSettings(settings: DashboardSettings): void {
  snapshot = {
    currency: settings.displayCostCurrency,
    rates: { USD: 1, ...settings.costFxRates },
  };
}

export function getCostDisplaySnapshot(): CostDisplaySnapshot {
  return snapshot;
}
