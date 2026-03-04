import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ChatState = {
  messages: Message[];
  addMessage: (role: "user" | "assistant", content: string) => void;
  clearHistory: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (role, content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: Math.random().toString(36).substring(7),
              role,
              content,
              timestamp: Date.now()
            }
          ]
        })),
      clearHistory: () => set({ messages: [] })
    }),
    {
      name: "kafi-chat-history"
    }
  )
);
