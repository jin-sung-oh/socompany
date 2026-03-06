import { ipcMain } from "electron";
import type { WebContents } from "electron";
import type { Agent } from "@kafi/shared";
import { readSettings, writeSettings } from "./settings.js";
import { buildAgentSystemPrompt, normalizeSettings } from "./agentCatalog.js";
import { Ollama } from "ollama";

const statusCycle: Agent["status"][] = ["idle", "thinking", "working", "completed"];

type AgentUpdate = Pick<Agent, "id" | "name" | "species" | "role" | "status">;

let agents: AgentUpdate[] = normalizeSettings(readSettings()).agents.map((agent) => ({
  id: agent.id,
  name: agent.name,
  species: agent.species,
  role: agent.role,
  status: agent.status,
}));

const logSubscribers = new Set<WebContents>();
const agentSubscribers = new Set<WebContents>();

const addSubscriber = (set: Set<WebContents>, sender: WebContents) => {
  set.add(sender);
  sender.once("destroyed", () => {
    set.delete(sender);
  });
};

let intervalStarted = false;

const refreshAgentUpdates = () => {
  const settings = normalizeSettings(readSettings());
  agents = settings.agents.map((agent, index) => ({
    id: agent.id,
    name: agent.name,
    species: agent.species,
    role: agent.role,
    status: agents[index]?.status ?? agent.status,
  }));
};

const broadcastAgents = () => {
  agentSubscribers.forEach((subscriber) => {
    subscriber.send("kafi:agents-updated", agents);
  });
};

const startMockStreams = () => {
  if (intervalStarted) {
    return;
  }
  intervalStarted = true;

  setInterval(() => {
    if (agents.length === 0) {
      refreshAgentUpdates();
    }

    const nextAgents = [...agents];
    const rotatingIndex = Math.floor(Date.now() / 4000) % Math.max(1, nextAgents.length);

    nextAgents.forEach((agent, index) => {
      if (index === rotatingIndex) {
        const currentIndex = statusCycle.indexOf(agent.status);
        agent.status = statusCycle[(currentIndex + 1) % statusCycle.length];
        return;
      }
      if (agent.status !== "idle") {
        agent.status = "idle";
      }
    });

    agents = nextAgents;
    broadcastAgents();

    const activeAgent = agents[rotatingIndex];
    const logLine = activeAgent
      ? `${activeAgent.name}(${activeAgent.role}) 상태 변경: ${activeAgent.status}`
      : `작업 로그 ${new Date().toLocaleTimeString()}`;

    logSubscribers.forEach((subscriber) => {
      subscriber.send("kafi:log-line", logLine);
    });
  }, 4000);
};

export const registerIpcHandlers = () => {
  const ollama = new Ollama({ host: "http://localhost:11434" });

  ipcMain.handle("kafi:get-settings", () => readSettings());
  ipcMain.handle("kafi:set-settings", (_event, payload) => {
    const normalized = normalizeSettings(payload);
    writeSettings(normalized);
    refreshAgentUpdates();
    broadcastAgents();
  });

  ipcMain.handle("kafi:get-agents", () => {
    const settings = readSettings();
    return settings.agents;
  });

  ipcMain.handle("kafi:ollama-chat", async (_event, payload: { message: string; agentId?: string } | string) => {
    try {
      const settings = readSettings();
      const model = settings.ollamaModel || "llama2";
      const message = typeof payload === "string" ? payload : payload.message;
      const agentId = typeof payload === "string" ? undefined : payload.agentId;
      const agent = agentId ? settings.agents.find((item) => item.id === agentId) : settings.agents[0];

      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: "메시지가 필요합니다.",
        };
      }

      const systemPrompt = agent ? buildAgentSystemPrompt(agent) : "항상 한국어로 답변하는 유능한 동물 사원으로 행동하세요.";
      const response = await ollama.generate({
        model,
        system: systemPrompt,
        prompt: message,
        stream: false,
        options: settings.ollamaParameters,
      });

      return {
        success: true,
        response: response.response,
      };
    } catch (error) {
      console.error("Ollama 에러:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 에러",
      };
    }
  });

  ipcMain.handle("kafi:get-ollama-models", async () => {
    try {
      const response = await ollama.list();
      return { success: true, models: response.models };
    } catch (error) {
      console.error("Ollama 모델 목록 에러:", error);
      return { success: false, error: error instanceof Error ? error.message : "알 수 없는 에러" };
    }
  });

  ipcMain.handle("kafi:ollama-check", async () => {
    try {
      await ollama.list();
      return { connected: true };
    } catch (error) {
      return { connected: false };
    }
  });

  ipcMain.on("kafi:subscribe-logs", (event) => {
    addSubscriber(logSubscribers, event.sender);
    startMockStreams();
  });

  ipcMain.on("kafi:subscribe-agents", (event) => {
    addSubscriber(agentSubscribers, event.sender);
    refreshAgentUpdates();
    broadcastAgents();
    startMockStreams();
  });

  ipcMain.on("kafi:unsubscribe-logs", (event) => {
    logSubscribers.delete(event.sender);
  });

  ipcMain.on("kafi:unsubscribe-agents", (event) => {
    agentSubscribers.delete(event.sender);
  });
};
