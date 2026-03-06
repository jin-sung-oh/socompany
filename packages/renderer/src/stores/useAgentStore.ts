import { create } from "zustand";
import type { Agent, AgentStatus } from "@kafi/shared";
import { createDefaultAgents } from "../data/agentCatalog";

export type AgentBehavior = "wandering" | "working" | "resting" | "talking";

export interface AgentState extends Agent {
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  direction: "left" | "right" | "up" | "down";
  behavior: AgentBehavior;
}

export type AgentSummary = Pick<Agent, "id" | "name" | "species" | "role" | "status">;

type AgentPatch = Partial<Agent> & Pick<Agent, "id">;

interface AgentStore {
  agents: AgentState[];
  setAgents: (agents: Agent[] | AgentState[]) => void;
  mergeAgentUpdates: (agents: AgentPatch[]) => void;
  updateAgent: (id: string, updates: Partial<AgentState>) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  moveAgents: () => void;
}

const fallbackPosition = (index: number) => ({
  x: 18 + (index % 3) * 28,
  y: 24 + Math.floor(index / 3) * 28,
});

const toAgentState = (agent: Agent | AgentState, index: number, previous?: AgentState): AgentState => ({
  ...agent,
  position: "position" in agent ? agent.position : previous?.position ?? fallbackPosition(index),
  targetPosition: "targetPosition" in agent ? agent.targetPosition : previous?.targetPosition ?? null,
  direction: "direction" in agent ? agent.direction : previous?.direction ?? "right",
  behavior:
    "behavior" in agent
      ? agent.behavior
      : previous?.behavior ?? (agent.status === "working" ? "working" : "wandering"),
});

const mapToAgentStates = (agents: Agent[] | AgentState[], previous: AgentState[] = []): AgentState[] =>
  agents.map((agent, index) => {
    const prev = previous.find((item) => item.id === agent.id);
    return toAgentState(agent, index, prev);
  });

const initialAgents = mapToAgentStates(createDefaultAgents());

export const useAgentStore = create<AgentStore>((set) => ({
  agents: initialAgents,
  setAgents: (agents) => set((state) => ({ agents: mapToAgentStates(agents, state.agents) })),
  mergeAgentUpdates: (updates) =>
    set((state) => ({
      agents: state.agents.map((agent, index) => {
        const incoming = updates.find((item) => item.id === agent.id);
        if (!incoming) {
          return agent;
        }
        return toAgentState(
          {
            ...agent,
            ...incoming,
            character: incoming.character ?? agent.character,
            currentTask: incoming.currentTask ?? agent.currentTask,
            persona: incoming.persona ?? agent.persona,
          },
          index,
          agent,
        );
      }),
    })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent)),
    })),
  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id
          ? {
              ...agent,
              status,
              behavior: status === "working" ? "working" : status === "chatting" ? "talking" : agent.behavior,
            }
          : agent,
      ),
    })),
  moveAgents: () =>
    set((state) => ({
      agents: state.agents.map((agent) => {
        if (agent.behavior === "working") {
          return agent;
        }

        if (!agent.targetPosition) {
          return {
            ...agent,
            targetPosition: {
              x: 10 + Math.random() * 80,
              y: 10 + Math.random() * 80,
            },
          };
        }

        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) {
          return {
            ...agent,
            targetPosition: null,
            behavior: Math.random() > 0.75 ? "working" : "wandering",
          };
        }

        const speed = 0.38;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        return {
          ...agent,
          position: {
            x: Math.max(8, Math.min(92, agent.position.x + vx)),
            y: Math.max(10, Math.min(90, agent.position.y + vy)),
          },
          direction: Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? "right" : "left") : vy >= 0 ? "down" : "up",
        };
      }),
    })),
}));
