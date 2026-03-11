export type FastApiAgentType = "research" | "trend" | "planning" | "coding" | "test" | "document" | "rag";

export type FastApiTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type FastApiTaskRecord = {
  id: string;
  agent_type: FastApiAgentType;
  input_data: string;
  status: FastApiTaskStatus;
  output_data: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type FastApiBridgeConfig = {
  baseUrl: string | null;
  rootPath: string;
  healthPath: string;
  agentsPath: string;
  taskPath: string;
  pollIntervalMs: number;
  timeoutMs: number;
  sharedSecret: string | null;
};

type FastApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  payload?: T;
  error?: string;
};

const normalizeUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const normalizePath = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export const getFastApiBridgeConfig = (): FastApiBridgeConfig => ({
  baseUrl: normalizeUrl(process.env.FASTAPI_BASE_URL),
  rootPath: normalizePath(process.env.FASTAPI_ROOT_PATH, "/"),
  healthPath: normalizePath(process.env.FASTAPI_HEALTH_PATH, "/health"),
  agentsPath: normalizePath(process.env.FASTAPI_AGENTS_PATH, "/api/v1/agents"),
  taskPath: normalizePath(process.env.FASTAPI_TASK_PATH, "/api/v1/tasks"),
  pollIntervalMs: Number(process.env.FASTAPI_POLL_INTERVAL_MS) || 2000,
  timeoutMs: Number(process.env.FASTAPI_TIMEOUT_MS) || 300000,
  sharedSecret: process.env.FASTAPI_BRIDGE_SECRET?.trim() || null,
});

export const isFastApiBridgeEnabled = () => Boolean(getFastApiBridgeConfig().baseUrl);

const buildHeaders = (sharedSecret: string | null, extra?: HeadersInit): HeadersInit => ({
  "content-type": "application/json",
  ...(sharedSecret ? { "x-kafi-bridge-secret": sharedSecret } : {}),
  ...(extra ?? {}),
});

const buildUrl = (baseUrl: string, path: string) => `${baseUrl}${path}`;

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

const requestFastApi = async <T = unknown>(path: string, init?: RequestInit): Promise<FastApiResponse<T>> => {
  const config = getFastApiBridgeConfig();
  if (!config.baseUrl) {
    return {
      ok: false,
      status: 0,
      error: "FASTAPI_BASE_URL is not configured",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(buildUrl(config.baseUrl, path), {
      ...init,
      headers: buildHeaders(config.sharedSecret, init?.headers),
      signal: controller.signal,
    });
    const payload = (await parseResponseBody(response)) as T;

    return {
      ok: response.ok,
      status: response.status,
      payload,
      error: response.ok ? undefined : typeof payload === "string" ? payload : response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown FastAPI request error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchFastApiRoot = () => {
  const config = getFastApiBridgeConfig();
  return requestFastApi(config.rootPath, { method: "GET" });
};

export const pingFastApi = () => {
  const config = getFastApiBridgeConfig();
  return requestFastApi(config.healthPath, { method: "GET" });
};

export const fetchFastApiAgents = () => {
  const config = getFastApiBridgeConfig();
  return requestFastApi(config.agentsPath, { method: "GET" });
};

export const createFastApiTask = (payload: {
  agentType: FastApiAgentType;
  inputData: string;
}) => {
  const config = getFastApiBridgeConfig();

  return requestFastApi<FastApiTaskRecord>(config.taskPath, {
    method: "POST",
    body: JSON.stringify({
      agent_type: payload.agentType,
      input_data: payload.inputData,
    }),
  });
};

export const getFastApiTask = (taskId: string) => {
  const config = getFastApiBridgeConfig();
  return requestFastApi<FastApiTaskRecord>(`${config.taskPath}/${taskId}`, {
    method: "GET",
  });
};

export const isAuthorizedFastApiRequest = (incomingSecret?: string | string[]) => {
  const { sharedSecret } = getFastApiBridgeConfig();

  if (!sharedSecret) {
    return true;
  }

  if (Array.isArray(incomingSecret)) {
    return incomingSecret.includes(sharedSecret);
  }

  return incomingSecret === sharedSecret;
};
