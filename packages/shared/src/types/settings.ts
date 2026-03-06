import type { Agent } from "./agent";

export interface OllamaParameters {
  temperature: number;
  num_ctx: number;
  top_k: number;
  top_p: number;
}

export interface AppSettings {
  apiKey: string;
  theme: "light" | "dark" | "system";
  ollamaModel: string;
  ollamaParameters: OllamaParameters;
  agents: Agent[];
  widgetOpacity: number;
  language: "ko" | "en";
  characterType: "3d" | "video";
}
