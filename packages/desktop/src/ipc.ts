import { ipcMain } from "electron";
import type { WebContents } from "electron";
import { readSettings, writeSettings } from "./settings.js";
import { Ollama } from "ollama";

const statusCycle: Array<
  "idle" | "thinking" | "working" | "completed"
> = ["idle", "thinking", "working", "completed"];

type AgentSummary = {
  id: string;
  name: string;
  role: string;
  status: (typeof statusCycle)[number];
};

let agents: AgentSummary[] = [
  { id: "agent-1", name: "리뷰어", role: "code-reviewer", status: "working" },
  { id: "agent-2", name: "문서", role: "doc-writer", status: "idle" },
  { id: "agent-3", name: "테스터", role: "tester", status: "thinking" }
];

const logSubscribers = new Set<WebContents>();
const agentSubscribers = new Set<WebContents>();

const addSubscriber = (set: Set<WebContents>, sender: WebContents) => {
  set.add(sender);
  sender.once("destroyed", () => {
    set.delete(sender);
  });
};

let intervalStarted = false;

const startMockStreams = () => {
  if (intervalStarted) {
    return;
  }
  intervalStarted = true;

  setInterval(() => {
    const first = agents[0];
    if (first) {
      const index = statusCycle.indexOf(first.status);
      const nextStatus = statusCycle[(index + 1) % statusCycle.length];
      agents = [
        { ...first, status: nextStatus },
        ...agents.slice(1)
      ];
    }

    agentSubscribers.forEach((subscriber) => {
      subscriber.send("kafi:agents-updated", agents);
    });

    const logLine = `작업 로그 ${new Date().toLocaleTimeString()}`;
    logSubscribers.forEach((subscriber) => {
      subscriber.send("kafi:log-line", logLine);
    });
  }, 4000);
};

export const registerIpcHandlers = () => {
  const ollama = new Ollama({ host: "http://localhost:11434" });

  ipcMain.handle("kafi:get-settings", () => readSettings());
  ipcMain.handle("kafi:set-settings", (_event, payload) => {
    writeSettings(payload);
  });

  ipcMain.handle("kafi:get-agents", () => {
    const settings = readSettings();
    return settings.agents;
  });

  // Ollama 채팅 핸들러
  ipcMain.handle("kafi:ollama-chat", async (_event, message: string) => {
    try {
      const settings = readSettings();
      const model = settings.ollamaModel || "llama2";
      const agent = settings.agents[0]; // For now, use the first agent

      let systemPrompt = "You are a helpful AI assistant.";
      if (agent && agent.persona) {
        systemPrompt = `You are ${agent.name}. ${agent.persona.description}. Tone: ${agent.persona.tone}. Instructions: ${agent.persona.instructions.join(" ")}`;
      }

      const response = await ollama.generate({
        model,
        system: systemPrompt,
        prompt: message,
        stream: false,
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

  // Ollama 모델 목록 가져오기
  ipcMain.handle("kafi:get-ollama-models", async () => {
    try {
      const response = await ollama.list();
      return { success: true, models: response.models };
    } catch (error) {
      console.error("Ollama 모델 목록 에러:", error);
      return { success: false, error: error instanceof Error ? error.message : "알 수 없는 에러" };
    }
  });

  // Ollama 연결 확인
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
    startMockStreams();
  });

  ipcMain.on("kafi:unsubscribe-logs", (event) => {
    logSubscribers.delete(event.sender);
  });

  ipcMain.on("kafi:unsubscribe-agents", (event) => {
    agentSubscribers.delete(event.sender);
  });
};
