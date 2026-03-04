import { create } from "zustand";
import { Agent } from "@kafi/shared";

export type SettingsPayload = {
  apiKey: string;
  theme: "light" | "dark" | "system";
  ollamaModel: string;
  agents: Agent[];
  widgetOpacity: number;
  language: "ko" | "en";
  characterType: "3d" | "video";
};

const defaultSettings: SettingsPayload = {
  apiKey: "",
  theme: "system",
  ollamaModel: "llama2",
  agents: [],
  widgetOpacity: 100,
  language: "ko",
  characterType: "video"
};

type SettingsState = {
  settings: SettingsPayload;
  status: "idle" | "loading" | "saving" | "saved";
  setSettings: (next: SettingsPayload) => void;
  load: () => Promise<void>;
  save: () => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  status: "idle",
  setSettings: (next) => set({ settings: next }),
  load: async () => {
    if (!window.kafi?.getSettings) {
      return;
    }
    set({ status: "loading" });
    const stored = await window.kafi.getSettings();
    set({ settings: { ...defaultSettings, ...stored }, status: "idle" });
  },
  save: async () => {
    if (!window.kafi?.setSettings) {
      return;
    }
    set({ status: "saving" });
    await window.kafi.setSettings(get().settings);
    set({ status: "saved" });
    window.setTimeout(() => set({ status: "idle" }), 1500);
  }
}));
