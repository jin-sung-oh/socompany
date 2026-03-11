import type { AgentState } from "../../stores/useAgentStore";

type SpatialPromptContext = {
  agent: AgentState;
  userMessage: string;
  currentLocation: string;
  nearbyAgents: AgentState[];
  timeOfDay: string;
  userHistorySummary: string;
};

export type SpatialConversationResponse = {
  message: string;
  action: "idle" | "walk" | "wave";
};

export const buildSpatialConversationPrompt = ({
  agent,
  userMessage,
  currentLocation,
  nearbyAgents,
  timeOfDay,
  userHistorySummary,
}: SpatialPromptContext) =>
  [
    `Species & Role: You are a ${agent.role} ${agent.species}.`,
    `Personality: ${agent.personality}.`,
    `Dialogue Style: ${agent.dialogueStyle}.`,
    `Current_Location: ${currentLocation}.`,
    `WorldState: Nearby agents are ${nearbyAgents.length ? nearbyAgents.map((item) => `${item.name} (${item.role})`).join(", ") : "none"}. Time of day is ${timeOfDay}.`,
    `User_History: ${userHistorySummary || "No meaningful history yet."}`,
    "You are speaking to the office CEO in a Gather-style spatial office.",
    'Return strict JSON only in this format: {"message":"string","action":"idle | walk | wave"}.',
    `CEO Message: ${userMessage}`,
  ].join("\n");

export const parseSpatialConversationResponse = (raw: string): SpatialConversationResponse => {
  const trimmed = raw.trim();
  const jsonCandidate = trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;

  try {
    const parsed = JSON.parse(jsonCandidate) as Partial<SpatialConversationResponse>;
    return {
      message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim() : trimmed,
      action:
        parsed.action === "walk" || parsed.action === "wave" || parsed.action === "idle"
          ? parsed.action
          : "idle",
    };
  } catch {
    return {
      message: trimmed,
      action: "idle",
    };
  }
};
