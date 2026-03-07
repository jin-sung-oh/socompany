import { create } from "zustand";
import type { Agent, AgentStatus } from "@kafi/shared";
import { createDefaultAgents } from "../data/agentCatalog";
import type { OfficePoint } from "../data/officeLayout";
import {
  clampOfficePosition,
  distanceBetween,
  getDirectionFromVector,
  getNextOfficeWaypoint,
  getRandomOfficePosition,
  moveWithinOffice,
} from "../data/officeNavigation";

export type AgentBehavior = "wandering" | "working" | "resting" | "talking";

export interface AgentState extends Agent {
  position: OfficePoint;
  targetPosition: OfficePoint | null;
  direction: "left" | "right" | "up" | "down";
  behavior: AgentBehavior;
}

export type AgentSummary = Pick<Agent, "id" | "name" | "species" | "role" | "status">;

type AgentPatch = Partial<Agent> & Pick<Agent, "id">;

interface AgentStore {
  agents: AgentState[];
  officePlayerPosition: OfficePoint | null;
  setAgents: (agents: Agent[] | AgentState[]) => void;
  mergeAgentUpdates: (agents: AgentPatch[]) => void;
  updateAgent: (id: string, updates: Partial<AgentState>) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  setOfficePlayerPosition: (position: OfficePoint | null) => void;
  moveAgents: () => void;
}

const fallbackPosition = (index: number) => ({
  x: 18 + (index % 3) * 28,
  y: 24 + Math.floor(index / 3) * 28,
});

const statusToBehavior = (status: AgentStatus): AgentBehavior => {
  switch (status) {
    case "working":
      return "working";
    case "thinking":
    case "chatting":
      return "talking";
    case "completed":
      return "resting";
    default:
      return "wandering";
  }
};

const toAgentState = (agent: Agent | AgentState, index: number, previous?: AgentState): AgentState => ({
  ...agent,
  position: "position" in agent ? agent.position : previous?.position ?? fallbackPosition(index),
  targetPosition: "targetPosition" in agent ? agent.targetPosition : previous?.targetPosition ?? null,
  direction: "direction" in agent ? agent.direction : previous?.direction ?? "right",
  behavior:
    "behavior" in agent
      ? agent.behavior
      : previous?.behavior ?? statusToBehavior(agent.status),
});

const mapToAgentStates = (agents: Agent[] | AgentState[], previous: AgentState[] = []): AgentState[] =>
  agents.map((agent, index) => {
    const prev = previous.find((item) => item.id === agent.id);
    return toAgentState(agent, index, prev);
  });

const initialAgents = mapToAgentStates(createDefaultAgents());

export const useAgentStore = create<AgentStore>((set) => ({
  agents: initialAgents,
  officePlayerPosition: null,
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
              behavior: statusToBehavior(status),
            }
          : agent,
      ),
    })),
  setOfficePlayerPosition: (position) => set(() => ({ officePlayerPosition: position })),
  moveAgents: () =>
    set((state) => {
      const nextAgents: AgentState[] = [];
      const stationaryObstacles = state.officePlayerPosition ? [state.officePlayerPosition] : [];

      state.agents.forEach((agent, index) => {
        if (agent.behavior === "working" && !agent.targetPosition) {
          nextAgents.push(agent);
          return;
        }

        if (!agent.targetPosition) {
          const blockedPositions = [
            ...stationaryObstacles,
            ...nextAgents.map((item) => item.position),
            ...state.agents.slice(index + 1).map((item) => item.position),
          ];

          nextAgents.push({
            ...agent,
            targetPosition: getRandomOfficePosition({
              blockedPositions,
              collisionRadius: 4.6,
            }),
          });
          return;
        }

        if (distanceBetween(agent.position, agent.targetPosition) < 1) {
          nextAgents.push({
            ...agent,
            targetPosition: null,
            behavior: agent.status === "working" ? "working" : Math.random() > 0.75 ? "working" : "wandering",
          });
          return;
        }

        const waypoint = getNextOfficeWaypoint(agent.position, agent.targetPosition);
        const dx = waypoint.x - agent.position.x;
        const dy = waypoint.y - agent.position.y;
        const waypointDistance = Math.sqrt(dx * dx + dy * dy);

        if (waypointDistance < 0.35) {
          nextAgents.push({
            ...agent,
            position: clampOfficePosition(waypoint.x, waypoint.y),
          });
          return;
        }

        const speed = 0.38;
        const vx = (dx / waypointDistance) * speed;
        const vy = (dy / waypointDistance) * speed;
        const blockedPositions = [
          ...stationaryObstacles,
          ...nextAgents.map((item) => item.position),
          ...state.agents.slice(index + 1).map((item) => item.position),
        ];
        const nextPosition = moveWithinOffice(agent.position, { x: vx, y: vy }, { blockedPositions, collisionRadius: 4.6 });
        const didMove = distanceBetween(agent.position, nextPosition) > 0.01;

        nextAgents.push({
          ...agent,
          position: nextPosition,
          direction: didMove ? getDirectionFromVector(vx, vy, agent.direction) : agent.direction,
        });
      });

      return { agents: nextAgents };
    }),
}));
