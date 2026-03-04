export interface CharacterConfig {
  idleAsset: string;
  workingAsset: string;
  thinkingAsset: string;
  completedAsset: string;
  errorAsset: string;
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
}

export interface Persona {
  description: string;
  tone: "friendly" | "professional" | "strict" | "casual";
  instructions: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  character: CharacterConfig;
  status: AgentStatus;
  currentTask: Task | null;
  persona?: Persona;
}

export type AgentRole =
  | "code-reviewer"
  | "doc-writer"
  | "tester"
  | "planner"
  | "designer"
  | "custom";

export type AgentStatus =
  | "idle"
  | "working"
  | "thinking"
  | "completed"
  | "error"
  | "chatting";
