import { create } from "zustand";

const PRIVACY_MODE_STORAGE_KEY = "codex-lb-privacy-mode";
const LEGACY_PRIVACY_STORAGE_KEY = "codex-lb-privacy";

export type PrivacyMode = "visible" | "blur" | "prefix";

const PRIVACY_MODES = new Set<PrivacyMode>(["visible", "blur", "prefix"]);

type PrivacyState = {
  /** How account/email labels are displayed across the dashboard. */
  mode: PrivacyMode;
  /** Set account/email display mode and persist to localStorage. */
  setMode: (mode: PrivacyMode) => void;
};

function readStored(): PrivacyMode {
  if (typeof window === "undefined") return "visible";
  try {
    const stored = window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY);
    if (stored && PRIVACY_MODES.has(stored as PrivacyMode)) {
      return stored as PrivacyMode;
    }
    return window.localStorage.getItem(LEGACY_PRIVACY_STORAGE_KEY) === "1" ? "blur" : "visible";
  } catch {
    return "visible";
  }
}

function persist(mode: PrivacyMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, mode);
  } catch {
    /* Storage blocked — silently ignore. */
  }
}

export const usePrivacyStore = create<PrivacyState>((set) => ({
  mode: readStored(),
  setMode: (mode) => {
    persist(mode);
    set({ mode });
  },
}));
