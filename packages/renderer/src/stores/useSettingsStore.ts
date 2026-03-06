import { create } from "zustand";
import type { AppSettings } from "@kafi/shared";
import { createDefaultSettings, normalizeSettings } from "../data/agentCatalog";

export type SettingsPayload = AppSettings;

type SettingsState = {
  settings: SettingsPayload;
  status: "idle" | "loading" | "saving" | "saved";
  setSettings: (next: SettingsPayload) => void;
  load: () => Promise<void>;
  save: () => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: createDefaultSettings(),
  status: "idle",
  setSettings: (next) => set({ settings: normalizeSettings(next) }),
  load: async () => {
    if (!window.kafi?.getSettings) {
      return;
    }
    set({ status: "loading" });
    const stored = await window.kafi.getSettings();
    set({ settings: normalizeSettings(stored), status: "idle" });
  },
  save: async () => {
    if (!window.kafi?.setSettings) {
      return;
    }
    set({ status: "saving" });
    await window.kafi.setSettings(normalizeSettings(get().settings));
    set({ status: "saved" });
    window.setTimeout(() => set({ status: "idle" }), 1500);
  },
}));
