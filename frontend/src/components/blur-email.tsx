import type { ReactNode } from "react";

import type { PrivacyMode } from "@/hooks/use-privacy";

/**
 * True when `label` matches `email` exactly — the label was derived from an email address.
 * Avoids false positives from display names that happen to contain "@".
 */
export function isEmailLabel(label: string | null | undefined, email: string | null | undefined): boolean {
  return !!label && !!email && label === email;
}

export function formatPrivacyLabel(label: string, mode: PrivacyMode): string {
  const characters = Array.from(label);
  if (mode !== "prefix" || characters.length <= 6) {
    return label;
  }
  return `${characters.slice(0, 6).join("")}…`;
}

export function renderPrivacyLabel(label: string, mode: PrivacyMode): ReactNode {
  if (mode === "blur") {
    return <span className="privacy-blur">{label}</span>;
  }
  return formatPrivacyLabel(label, mode);
}
