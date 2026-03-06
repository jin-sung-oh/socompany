import type { Agent, AgentStatus, AppSettings } from "@kafi/shared";

export {};

type AgentUpdate = Pick<Agent, "id"> & Partial<Agent> & { status?: AgentStatus };

declare global {
  interface Window {
    kafi?: {
      getSettings: () => Promise<Partial<AppSettings>>;
      setSettings: (payload: AppSettings) => Promise<void>;
      getAgents: () => Promise<Agent[]>;
      subscribeAgents: (callback: (agents: AgentUpdate[]) => void) => () => void;
      subscribeLogs: (callback: (line: string) => void) => () => void;
      ollamaChat: (payload: { message: string; agentId?: string } | string) => Promise<{ success: boolean; response?: string; error?: string }>;
      getOllamaModels: () => Promise<{ success: boolean; models?: Array<{ name: string }>; error?: string }>;
      ollamaCheck: () => Promise<{ connected: boolean }>;
    };
  }
}
