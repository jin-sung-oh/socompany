import { create } from "zustand";

type LogState = {
  logs: string[];
  addLog: (line: string) => void;
  clear: () => void;
};

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (line) =>
    set((state) => ({
      logs: [line, ...state.logs].slice(0, 6)
    })),
  clear: () => set({ logs: [] })
}));
