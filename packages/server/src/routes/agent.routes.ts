import { FastifyInstance } from "fastify";
import { enqueueTask, getAgents } from "../orchestrator.js";

export default async function agentRoutes(fastify: FastifyInstance) {
  fastify.get("/agents", async () => {
    return { agents: getAgents() };
  });

  fastify.post("/tasks", async (request) => {
    const { task } = request.body as { task?: string };

    if (!task || task.trim().length === 0) {
      return { status: "error", message: "Task is required" };
    }

    enqueueTask(task.trim());
    return { status: "success", message: "Task queued" };
  });

  fastify.post("/agents/:id/task", async (request) => {
    const { id } = request.params as { id: string };
    const { task } = request.body as { task?: string };

    if (!task || task.trim().length === 0) {
      return { status: "error", message: "Task is required" };
    }

    fastify.log.info(`Assigning task to agent ${id}: ${task}`);
    enqueueTask(task.trim());
    return { status: "success", message: `Task queued for agent ${id}` };
  });
}
