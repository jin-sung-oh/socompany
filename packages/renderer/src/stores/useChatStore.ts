import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ChatState = {
  messagesByAgent: Record<string, Message[]>;
  addMessage: (agentId: string, role: "user" | "assistant", content: string) => void;
  clearHistory: (agentId?: string) => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messagesByAgent: {},
      addMessage: (agentId, role, content) =>
        set((state) => {
          const current = state.messagesByAgent[agentId] ?? [];
          return {
            messagesByAgent: {
              ...state.messagesByAgent,
              [agentId]: [
                ...current,
                {
                  id: Math.random().toString(36).substring(7),
                  role,
                  content,
                  timestamp: Date.now()
                }
              ]
            }
          };
        }),
      clearHistory: (agentId) =>
        set((state) => {
          if (!agentId) {
            return { messagesByAgent: {} };
          }
          const next = { ...state.messagesByAgent };
          delete next[agentId];
          return { messagesByAgent: next };
        })
    }),
    {
      name: "kafi-chat-history"
    }
  )
);
