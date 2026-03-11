export interface CharacterConfig {
  idleAsset: string;
  workingAsset: string;
  thinkingAsset: string;
  completedAsset: string;
  errorAsset: string;
}

export const animalSpecies = [
  "capybara",
  "pig",
  "fox",
  "tiger",
  "dog",
  "cat",
] as const;

export type AnimalSpecies = (typeof animalSpecies)[number];

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
  species: AnimalSpecies;
  role: string;
  personality: string;
  dialogueStyle: string;
  character: CharacterConfig;
  status: AgentStatus;
  currentTask: Task | null;
  persona?: Persona;
}

export type AgentStatus =
  | "idle"
  | "working"
  | "thinking"
  | "completed"
  | "error"
  | "chatting";
