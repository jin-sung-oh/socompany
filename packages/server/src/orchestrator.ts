import {
  createFastApiTask,
  getFastApiBridgeConfig,
  getFastApiTask,
  isFastApiBridgeEnabled,
  type FastApiAgentType,
  type FastApiTaskRecord,
  type FastApiTaskStatus,
} from "./fastapiBridge.js";

export type AgentStatus = "idle" | "thinking" | "working" | "completed" | "error" | "chatting";

export type AgentSummary = {
  id: string;
  name: string;
  species: "capybara" | "pig" | "fox" | "tiger" | "dog" | "cat";
  role: string;
  status: AgentStatus;
};

type EmitFn = (event: string, payload: unknown) => void;

type TaskRequest = {
  task: string;
  requestedAt: number;
  source?: "socket" | "rest" | "agent";
};

type FastApiPipelineStep = {
  agentId: string;
  agentName: string;
  fastApiType: FastApiAgentType;
  queuedMessage: string;
};

const agents: AgentSummary[] = [
  { id: "agent-pm", name: "카피바라 PM", species: "capybara", role: "PM Agent", status: "idle" },
  { id: "agent-research", name: "여우 리서치", species: "fox", role: "Research Agent", status: "idle" },
  { id: "agent-trend", name: "여우 트렌드", species: "fox", role: "Trend Agent", status: "idle" },
  { id: "agent-planning", name: "호랑이 기획", species: "tiger", role: "Planning Agent", status: "idle" },
  { id: "agent-document", name: "돼지 문서", species: "pig", role: "Document Agent", status: "idle" },
  { id: "agent-coding", name: "고양이 코딩", species: "cat", role: "Coding Agent", status: "idle" },
  { id: "agent-test", name: "개 테스트", species: "dog", role: "Test Agent", status: "idle" },
];

const fastApiPipeline: FastApiPipelineStep[] = [
  {
    agentId: "agent-research",
    agentName: "여우 리서치",
    fastApiType: "research",
    queuedMessage: "웹 리서치 task를 생성합니다.",
  },
  {
    agentId: "agent-trend",
    agentName: "여우 트렌드",
    fastApiType: "trend",
    queuedMessage: "트렌드 분석 task를 생성합니다.",
  },
  {
    agentId: "agent-planning",
    agentName: "호랑이 기획",
    fastApiType: "planning",
    queuedMessage: "기획 task를 생성합니다.",
  },
  {
    agentId: "agent-coding",
    agentName: "고양이 코딩",
    fastApiType: "coding",
    queuedMessage: "코딩 task를 생성합니다.",
  },
  {
    agentId: "agent-test",
    agentName: "개 테스트",
    fastApiType: "test",
    queuedMessage: "테스트 task를 생성합니다.",
  },
  {
    agentId: "agent-document",
    agentName: "돼지 문서",
    fastApiType: "document",
    queuedMessage: "문서화 task를 생성합니다.",
  },
];

let emit: EmitFn = () => {};

const taskQueue: TaskRequest[] = [];
let processing = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatLogLine = (message: string) => {
  const time = new Date().toLocaleTimeString();
  return `업무 로그 ${time} ${message}`;
};

const emitAgents = () => {
  emit("agent:list", { agents: agents.map((agent) => ({ ...agent })) });
};

const emitLog = (message: string) => {
  emit("log:line", formatLogLine(message));
};

const resetAgentsToIdle = () => {
  agents.forEach((agent) => {
    agent.status = "idle";
  });
  emitAgents();
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

const summarizeOutput = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
};

const isFastApiTaskRecord = (value: unknown): value is FastApiTaskRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FastApiTaskRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.agent_type === "string" &&
    typeof candidate.input_data === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.created_at === "string"
  );
};

const mapFastApiStatusToAgentStatus = (status: FastApiTaskStatus): AgentStatus => {
  switch (status) {
    case "pending":
      return "thinking";
    case "running":
      return "working";
    case "completed":
      return "completed";
    case "failed":
    case "cancelled":
      return "error";
    default:
      return "idle";
  }
};

const getFastApiStatusMessage = (status: FastApiTaskStatus) => {
  switch (status) {
    case "pending":
      return "FastAPI 대기열에서 작업 대기 중";
    case "running":
      return "FastAPI 에이전트 실행 중";
    case "completed":
      return "FastAPI 결과 수신 완료";
    case "failed":
      return "FastAPI 작업 실패";
    case "cancelled":
      return "FastAPI 작업 취소";
  }
};

const runLocalTask = async (task: TaskRequest) => {
  emitLog(`사장 요청 접수: ${task.task}`);

  updateAgentStatus("agent-pm", "thinking", "사장의 요청을 분석합니다.");
  emitLog("카피바라 PM: 작업 분배 계획 수립 중");
  await sleep(700);

  updateAgentStatus("agent-research", "working", "기초 자료를 조사합니다.");
  emitLog("여우 리서치: 자료 조사 진행");
  await sleep(750);

  updateAgentStatus("agent-trend", "working", "최근 흐름과 변화를 파악합니다.");
  emitLog("여우 트렌드: 최신 흐름 분석");
  await sleep(750);

  updateAgentStatus("agent-planning", "working", "실행 계획을 수립합니다.");
  emitLog("호랑이 기획: 실행 계획 구성");
  await sleep(750);

  updateAgentStatus("agent-document", "working", "결과를 문서로 정리합니다.");
  emitLog("돼지 문서: 산출물 문서화");
  await sleep(750);

  updateAgentStatus("agent-coding", "working", "필요한 구현 항목을 처리합니다.");
  emitLog("고양이 코딩: 구현 및 정리");
  await sleep(850);

  updateAgentStatus("agent-test", "working", "검증과 테스트를 수행합니다.");
  emitLog("개 테스트: 시나리오 검증 및 확인");
  await sleep(750);

  updateAgentStatus("agent-pm", "completed", "사장에게 보고할 준비가 끝났습니다.");
  emitLog("카피바라 PM: 최종 보고 완료");

  await sleep(600);
  resetAgentsToIdle();
};

const waitForFastApiTask = async (taskId: string, step: FastApiPipelineStep) => {
  const { pollIntervalMs, timeoutMs } = getFastApiBridgeConfig();
  const timeoutAt = Date.now() + timeoutMs;
  let lastStatus: FastApiTaskStatus | null = null;

  while (Date.now() <= timeoutAt) {
    const taskResult = await getFastApiTask(taskId);
    if (!taskResult.ok || !isFastApiTaskRecord(taskResult.payload)) {
      return {
        ok: false,
        error: taskResult.error ?? "FastAPI task 상태 조회 실패",
      };
    }

    const currentTask = taskResult.payload;
    if (currentTask.status !== lastStatus) {
      lastStatus = currentTask.status;
      updateAgentStatus(step.agentId, mapFastApiStatusToAgentStatus(currentTask.status), getFastApiStatusMessage(currentTask.status));
      emitLog(`${step.agentName}: FastAPI task 상태 ${currentTask.status}`);
    }

    if (currentTask.status === "completed") {
      return {
        ok: true,
        task: currentTask,
      };
    }

    if (currentTask.status === "failed" || currentTask.status === "cancelled") {
      return {
        ok: false,
        error: currentTask.error_message ?? `FastAPI task ${currentTask.status}`,
        task: currentTask,
      };
    }

    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    error: "FastAPI task polling timeout",
  };
};

const runFastApiTask = async (task: TaskRequest) => {
  emitLog(`사장 요청 접수: ${task.task}`);
  updateAgentStatus("agent-pm", "thinking", "FastAPI 워크플로우를 준비합니다.");
  emitLog("카피바라 PM: FastAPI 에이전트 파이프라인 시작");

  for (const step of fastApiPipeline) {
    updateAgentStatus(step.agentId, "thinking", step.queuedMessage);
    emitLog(`${step.agentName}: ${step.queuedMessage}`);

    const createdTask = await createFastApiTask({
      agentType: step.fastApiType,
      inputData: task.task,
    });

    if (!createdTask.ok || !isFastApiTaskRecord(createdTask.payload)) {
      updateAgentStatus(step.agentId, "error", "FastAPI task 생성 실패");
      updateAgentStatus("agent-pm", "error", "FastAPI 워크플로우 중단");
      emitLog(`${step.agentName}: FastAPI task 생성 실패 - ${createdTask.error ?? "응답 형식 오류"}`);
      await sleep(1500);
      resetAgentsToIdle();
      return;
    }

    emitLog(`${step.agentName}: Task ${createdTask.payload.id} 생성`);

    const result = await waitForFastApiTask(createdTask.payload.id, step);
    if (!result.ok || !result.task) {
      updateAgentStatus(step.agentId, "error", result.error ?? "FastAPI task 실패");
      updateAgentStatus("agent-pm", "error", "FastAPI 워크플로우 중단");
      emitLog(`${step.agentName}: ${result.error ?? "FastAPI task 실패"}`);
      await sleep(1500);
      resetAgentsToIdle();
      return;
    }

    const preview = summarizeOutput(result.task.output_data);
    emitLog(`${step.agentName}: ${preview || "결과 수신 완료"}`);
  }

  updateAgentStatus("agent-pm", "completed", "FastAPI 결과 취합 완료");
  emitLog("카피바라 PM: FastAPI 결과 취합 완료");
  await sleep(1200);
  resetAgentsToIdle();
};

const runTask = async (task: TaskRequest) => {
  if (!isFastApiBridgeEnabled()) {
    await runLocalTask(task);
    return;
  }

  await runFastApiTask(task);
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

export const getAgents = () => agents.map((agent) => ({ ...agent }));

export const mergeAgentsFromExternal = (incomingAgents: AgentSummary[]) => {
  incomingAgents.forEach((incomingAgent) => {
    const currentAgent = agents.find((agent) => agent.id === incomingAgent.id);
    if (currentAgent) {
      currentAgent.name = incomingAgent.name;
      currentAgent.species = incomingAgent.species;
      currentAgent.role = incomingAgent.role;
      currentAgent.status = incomingAgent.status;
      return;
    }

    agents.push({ ...incomingAgent });
  });

  emitAgents();
};

export const applyExternalAgentStatus = (id: string, status: AgentStatus, message?: string) => {
  updateAgentStatus(id, status, message);
  if (message) {
    emitLog(message);
  }
};

export const applyExternalLog = (message: string) => {
  emitLog(message);
};

export const applyExternalTaskResult = (success: boolean, message?: string) => {
  updateAgentStatus("agent-pm", success ? "completed" : "error", message);
  emitLog(message ?? (success ? "FastAPI 작업이 완료되었습니다." : "FastAPI 작업이 실패했습니다."));

  setTimeout(() => {
    resetAgentsToIdle();
  }, 1200);
};

export const enqueueTask = (task: string, source: TaskRequest["source"] = "rest") => {
  taskQueue.push({ task, requestedAt: Date.now(), source });
  void processQueue();
};

export const primeConnection = () => {
  emitAgents();
  emitLog("서버: 사장 대시보드 연결됨");
};
