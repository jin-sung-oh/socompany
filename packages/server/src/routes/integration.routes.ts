import { FastifyInstance } from "fastify";
import {
  createFastApiTask,
  fetchFastApiAgents,
  fetchFastApiRoot,
  getFastApiBridgeConfig,
  isAuthorizedFastApiRequest,
  pingFastApi,
  type FastApiAgentType,
} from "../fastapiBridge.js";
import type { AgentStatus, AgentSummary } from "../orchestrator.js";
import {
  applyExternalAgentStatus,
  applyExternalLog,
  applyExternalTaskResult,
  mergeAgentsFromExternal,
} from "../orchestrator.js";

type FastApiEventBody = {
  type?: "log" | "agent_status" | "agent_list" | "task_result";
  message?: string;
  agentId?: string;
  status?: AgentStatus;
  agents?: AgentSummary[];
  success?: boolean;
};

const isAgentStatus = (value: unknown): value is AgentStatus =>
  value === "idle" ||
  value === "thinking" ||
  value === "working" ||
  value === "completed" ||
  value === "error" ||
  value === "chatting";

const isFastApiAgentType = (value: unknown): value is FastApiAgentType =>
  value === "research" ||
  value === "trend" ||
  value === "planning" ||
  value === "coding" ||
  value === "test" ||
  value === "document" ||
  value === "rag";

const isAgentSummary = (value: unknown): value is AgentSummary => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AgentSummary>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.role === "string" &&
    (candidate.species === "capybara" ||
      candidate.species === "pig" ||
      candidate.species === "fox" ||
      candidate.species === "tiger" ||
      candidate.species === "dog" ||
      candidate.species === "cat") &&
    isAgentStatus(candidate.status)
  );
};

export default async function integrationRoutes(fastify: FastifyInstance) {
  fastify.get("/integrations/fastapi/health", async () => {
    const config = getFastApiBridgeConfig();
    const [root, health, agents] = await Promise.all([
      fetchFastApiRoot(),
      pingFastApi(),
      fetchFastApiAgents(),
    ]);

    return {
      configured: Boolean(config.baseUrl),
      baseUrl: config.baseUrl,
      root,
      health,
      agents,
      taskPath: config.taskPath,
      pollIntervalMs: config.pollIntervalMs,
      timeoutMs: config.timeoutMs,
      sharedSecretConfigured: Boolean(config.sharedSecret),
    };
  });

  fastify.get("/integrations/fastapi/info", async (_, reply) => {
    const result = await fetchFastApiRoot();
    if (!result.ok) {
      reply.code(result.status || 502);
      return { status: "error", message: result.error ?? "FastAPI root fetch failed", payload: result.payload };
    }
    return { status: "success", payload: result.payload };
  });

  fastify.get("/integrations/fastapi/agents", async (_, reply) => {
    const result = await fetchFastApiAgents();
    if (!result.ok) {
      reply.code(result.status || 502);
      return { status: "error", message: result.error ?? "FastAPI agents fetch failed", payload: result.payload };
    }
    return { status: "success", payload: result.payload };
  });

  fastify.post("/integrations/fastapi/dispatch", async (request, reply) => {
    const body = request.body as {
      agentType?: FastApiAgentType;
      inputData?: string;
      task?: string;
    };

    const agentType = body.agentType;
    const inputData = body.inputData?.trim() ?? body.task?.trim() ?? "";

    if (!isFastApiAgentType(agentType) || !inputData) {
      reply.code(400);
      return {
        status: "error",
        message: "agentType(research|trend|planning|coding|test|document|rag)와 inputData가 필요합니다.",
      };
    }

    const result = await createFastApiTask({
      agentType,
      inputData,
    });

    if (!result.ok) {
      reply.code(result.status || 502);
      return {
        status: "error",
        message: result.error ?? "FastAPI dispatch failed",
        payload: result.payload,
      };
    }

    return {
      status: "success",
      payload: result.payload,
    };
  });

  fastify.post("/integrations/fastapi/events", async (request, reply) => {
    if (!isAuthorizedFastApiRequest(request.headers["x-kafi-bridge-secret"])) {
      reply.code(401);
      return { status: "error", message: "Unauthorized bridge request" };
    }

    const body = request.body as FastApiEventBody;

    switch (body.type) {
      case "log":
        if (!body.message?.trim()) {
          reply.code(400);
          return { status: "error", message: "message is required for log events" };
        }
        applyExternalLog(body.message.trim());
        return { status: "success" };

      case "agent_status":
        if (!body.agentId?.trim() || !isAgentStatus(body.status)) {
          reply.code(400);
          return { status: "error", message: "agentId and valid status are required for agent_status events" };
        }
        applyExternalAgentStatus(body.agentId.trim(), body.status, body.message?.trim());
        return { status: "success" };

      case "agent_list":
        if (!Array.isArray(body.agents) || !body.agents.every(isAgentSummary)) {
          reply.code(400);
          return { status: "error", message: "agents array is required for agent_list events" };
        }
        mergeAgentsFromExternal(body.agents);
        if (body.message?.trim()) {
          applyExternalLog(body.message.trim());
        }
        return { status: "success" };

      case "task_result":
        applyExternalTaskResult(Boolean(body.success), body.message?.trim());
        if (Array.isArray(body.agents) && body.agents.every(isAgentSummary)) {
          mergeAgentsFromExternal(body.agents);
        }
        return { status: "success" };

      default:
        reply.code(400);
        return {
          status: "error",
          message: "Unsupported event type. Use log, agent_status, agent_list, or task_result.",
        };
    }
  });
}
