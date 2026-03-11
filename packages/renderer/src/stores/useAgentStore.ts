import { create } from "zustand";
import type { Agent, AgentStatus } from "@kafi/shared";
import { createDefaultAgents } from "../data/agentCatalog";
import type { OfficePoint } from "../data/officeLayout";
import {
  distanceBetween,
  getDirectionFromVector,
  getNextOfficeWaypoint,
  getZoneForPosition,
  getRandomOfficePosition,
} from "../data/officeNavigation";

export type AgentBehavior = "wandering" | "working" | "resting" | "talking";

export interface AgentState extends Agent {
  position: OfficePoint;
  targetPosition: OfficePoint | null;
  direction: "left" | "right" | "up" | "down";
  behavior: AgentBehavior;
  lastMovedAt: number;
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
  x: 3 + (index % 3) * 4,
  y: 4 + Math.floor(index / 3) * 3,
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
  lastMovedAt: "lastMovedAt" in agent ? agent.lastMovedAt : previous?.lastMovedAt ?? 0,
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
      const now = Date.now();
      const nextAgents: AgentState[] = [];
      const stationaryObstacles = state.officePlayerPosition ? [state.officePlayerPosition] : [];

      state.agents.forEach((agent, index) => {
        if ((agent.behavior === "working" || agent.behavior === "talking") && !agent.targetPosition) {
          nextAgents.push(agent);
          return;
        }

        if (!agent.targetPosition) {
          if (now - agent.lastMovedAt < 900 || Math.random() < 0.965) {
            nextAgents.push(agent);
            return;
          }

          const blockedPositions = [
            ...stationaryObstacles,
            ...nextAgents.map((item) => item.position),
            ...state.agents.slice(index + 1).map((item) => item.position),
          ];
          const currentZone = getZoneForPosition(agent.position);
          const wanderBaseOptions = {
            origin: agent.position,
            blockedPositions,
            minDistance: 1,
            avoidObjectKinds: ["door", "chair"] as const,
          };
          const preferredWanderTarget = getRandomOfficePosition({
            ...wanderBaseOptions,
            maxDistance: currentZone?.variant === "corridor" ? 5 : 4,
            allowedZoneIds: currentZone ? [currentZone.id, "zone-corridor"] : undefined,
            preferredZoneIds: currentZone ? [currentZone.id] : undefined,
          });
          const fallbackWanderTarget =
            currentZone?.id && currentZone.id !== "zone-corridor"
              ? getRandomOfficePosition({
                  ...wanderBaseOptions,
                  maxDistance: 6,
                  allowedZoneIds: ["zone-corridor"],
                  preferredZoneIds: ["zone-corridor"],
                })
              : null;
          const nextTarget = preferredWanderTarget ?? fallbackWanderTarget;

          if (!nextTarget) {
            nextAgents.push({
              ...agent,
              behavior: "resting",
              lastMovedAt: now,
            });
            return;
          }

          nextAgents.push({
            ...agent,
            targetPosition: nextTarget,
            behavior: "wandering",
            lastMovedAt: now,
          });
          return;
        }

        if (agent.position.x === agent.targetPosition.x && agent.position.y === agent.targetPosition.y) {
          nextAgents.push({
            ...agent,
            targetPosition: null,
            behavior:
              agent.status === "working"
                ? "working"
                : agent.status === "completed" || Math.random() > 0.45
                  ? "resting"
                  : "wandering",
            lastMovedAt: now,
          });
          return;
        }

        if (now - agent.lastMovedAt < 220) {
          nextAgents.push(agent);
          return;
        }

        const blockedPositions = [
          ...stationaryObstacles,
          ...nextAgents.map((item) => item.position),
          ...state.agents.slice(index + 1).map((item) => item.position),
        ];

        const nextPosition = getNextOfficeWaypoint(agent.position, agent.targetPosition, {
          blockedPositions,
          goal: agent.targetPosition,
        });
        const didMove = distanceBetween(agent.position, nextPosition) >= 1;

        if (!didMove && agent.status !== "working" && now - agent.lastMovedAt >= 660) {
          nextAgents.push({
            ...agent,
            targetPosition: null,
            behavior: "resting",
            lastMovedAt: now,
          });
          return;
        }

        nextAgents.push({
          ...agent,
          position: nextPosition,
          direction: didMove ? getDirectionFromVector(nextPosition.x - agent.position.x, nextPosition.y - agent.position.y, agent.direction) : agent.direction,
          lastMovedAt: didMove ? now : agent.lastMovedAt,
        });
      });

      return { agents: nextAgents };
    }),
}));
