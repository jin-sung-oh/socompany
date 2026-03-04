import type { Agent, Task } from "./agent";

export interface Team {
  id: string;
  name: string;
  agents: Agent[];
  tasks: Task[];
}
