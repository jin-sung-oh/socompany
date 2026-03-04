import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifySocketIO from "@fastify/socket.io";
import agentRoutes from "./routes/agent.routes.js";
import { enqueueTask, primeConnection, setEmitter } from "./orchestrator.js";

const fastify = Fastify({
  logger: true
});

fastify.register(cors, {
  origin: true
});

fastify.register(fastifySocketIO, {
  cors: {
    origin: "*"
  }
});

fastify.register(agentRoutes, { prefix: "/api" });

fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

setEmitter((event, payload) => {
  fastify.io.emit(event, payload);
});

fastify.ready((err) => {
  if (err) throw err;

  fastify.io.on("connection", (socket) => {
    fastify.log.info(`Client connected: ${socket.id}`);
    primeConnection();

    socket.on("disconnect", () => {
      fastify.log.info(`Client disconnected: ${socket.id}`);
    });

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });

    socket.on("task:start", (payload: { task?: string }) => {
      const task = payload?.task?.trim();
      if (!task) {
        socket.emit("task:error", { message: "Task is required" });
        return;
      }
      enqueueTask(task);
      socket.emit("task:queued", { task });
    });
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    fastify.log.info(`Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
