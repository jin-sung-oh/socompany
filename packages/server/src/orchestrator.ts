export type AgentStatus = "idle" | "thinking" | "working" | "completed" | "error";

export type AgentSummary = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
};

type EmitFn = (event: string, payload: unknown) => void;

type TaskRequest = {
  task: string;
  requestedAt: number;
};

const agents: AgentSummary[] = [
  { id: "pm", name: "Beaver", role: "pm", status: "idle" },
  { id: "research", name: "Fox", role: "research", status: "idle" },
  { id: "planning", name: "Owl", role: "planning", status: "idle" },
  { id: "document", name: "Squirrel", role: "document", status: "idle" },
  { id: "tester", name: "Turtle", role: "tester", status: "idle" }
];

let emit: EmitFn = () => {};

const taskQueue: TaskRequest[] = [];
let processing = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatLogLine = (message: string) => {
  const time = new Date().toLocaleTimeString();
  return `Work log ${time} ${message}`;
};

const emitAgents = () => {
  emit("agent:list", { agents: [...agents] });
};

const emitLog = (message: string) => {
  emit("log:line", formatLogLine(message));
};

const updateAgentStatus = (id: string, status: AgentStatus, message?: string) => {
  const agent = agents.find((item) => item.id === id);
  if (!agent) {
    return;
  }
  agent.status = status;
  emit("agent:status", { id, status, message });
  emitAgents();
};

const runTask = async (task: TaskRequest) => {
  emitLog(`PM: received task - ${task.task}`);
  updateAgentStatus("pm", "thinking", "Analyzing request");
  await sleep(800);

  updateAgentStatus("research", "working", "Gathering sources");
  emitLog("Research: collecting sources");
  await sleep(1100);

  updateAgentStatus("planning", "working", "Drafting structure");
  emitLog("Planning: outlining structure");
  await sleep(1000);

  updateAgentStatus("document", "working", "Writing summary");
  emitLog("Document: drafting report");
  await sleep(900);

  updateAgentStatus("tester", "working", "Preparing checks");
  emitLog("Tester: preparing QA checklist");
  await sleep(900);

  updateAgentStatus("pm", "completed", "Report ready");
  emitLog("PM: report delivered");

  await sleep(600);
  agents.forEach((agent) => {
    agent.status = "idle";
  });
  emitAgents();
};

const processQueue = async () => {
  if (processing) {
    return;
  }
  processing = true;
  while (taskQueue.length > 0) {
    const next = taskQueue.shift();
    if (!next) {
      continue;
    }
    await runTask(next);
  }
  processing = false;
};

export const setEmitter = (nextEmit: EmitFn) => {
  emit = nextEmit;
};

export const getAgents = () => [...agents];

export const enqueueTask = (task: string) => {
  taskQueue.push({ task, requestedAt: Date.now() });
  void processQueue();
};

export const primeConnection = () => {
  emitAgents();
  emitLog("Server: client connected");
};
