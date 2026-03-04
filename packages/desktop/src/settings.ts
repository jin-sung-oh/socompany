import fs from "fs";
import path from "path";
import os from "os";

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
  agents: [
    {
      id: "agent-1",
      name: "카피바라 리뷰어",
      role: "code-reviewer",
      status: "idle",
      currentTask: null,
      character: {
        idleAsset: "capybara_idle",
        workingAsset: "capybara_working",
        thinkingAsset: "capybara_thinking",
        completedAsset: "capybara_completed",
        errorAsset: "capybara_error"
      },
      persona: {
        description: "코드 리뷰를 꼼꼼하게 도와주는 카피바라",
        tone: "professional",
        instructions: ["코드 품질을 최우선으로 생각하세요.", "친절하게 조언하세요."]
      }
    }
  ],
  widgetOpacity: 100,
  language: "ko",
  characterType: "video"
};

const getSettingsPath = () => {
  const home = os.homedir();
  return path.join(home, ".kafi", "settings.json");
};

export const readSettings = (): SettingsPayload => {
  const filePath = getSettingsPath();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return { ...defaultSettings, ...JSON.parse(raw) } as SettingsPayload;
  } catch (error) {
    return defaultSettings;
  }
};

export const writeSettings = (payload: SettingsPayload) => {
  const filePath = getSettingsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
};
