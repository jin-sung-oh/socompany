export {};

declare global {
  interface Window {
    kafi?: {
      getSettings: () => Promise<{ apiKey: string; theme: "light" | "dark" | "system"; ollamaModel: string }>;
      setSettings: (payload: { apiKey: string; theme: "light" | "dark" | "system"; ollamaModel: string }) => Promise<void>;
      getAgents: () => Promise<Array<{ id: string; name: string; role: string; status: "idle" | "thinking" | "working" | "completed" | "error" }>>;
      subscribeAgents: (
        callback: (agents: Array<{ id: string; name: string; role: string; status: "idle" | "thinking" | "working" | "completed" | "error" }>) => void
      ) => () => void;
      subscribeLogs: (callback: (line: string) => void) => () => void;
      ollamaChat: (message: string) => Promise<{ success: boolean; response?: string; error?: string }>;
      getOllamaModels: () => Promise<{ success: boolean; models?: Array<{ name: string }>; error?: string }>;
      ollamaCheck: () => Promise<{ connected: boolean }>;
    };
  }
}
