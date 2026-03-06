import fs from "fs";
import path from "path";
import os from "os";

import type { AppSettings } from "@kafi/shared";
import { createDefaultSettings, normalizeSettings } from "./agentCatalog.js";

export type SettingsPayload = AppSettings;

const getSettingsPath = () => {
  const home = os.homedir();
  return path.join(home, ".kafi", "settings.json");
};

export const readSettings = (): SettingsPayload => {
  const filePath = getSettingsPath();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return normalizeSettings(JSON.parse(raw) as Partial<SettingsPayload>);
  } catch (error) {
    return createDefaultSettings();
  }
};

export const writeSettings = (payload: SettingsPayload) => {
  const filePath = getSettingsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(normalizeSettings(payload), null, 2), "utf-8");
};
