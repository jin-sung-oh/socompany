import { create } from "zustand";

export type AgentSummary = {
  id: string;
  name: string;
  role: string;
  status: "idle" | "working" | "thinking" | "completed" | "error";
};

type AgentState = {
  agents: AgentSummary[];
  setAgents: (agents: AgentSummary[]) => void;
  updateAgentStatus: (id: string, status: AgentSummary["status"]) => void;
};

const initialAgents: AgentSummary[] = [];

export const useAgentStore = create<AgentState>((set) => ({
  agents: initialAgents,
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status } : agent
      )
    }))
}));
