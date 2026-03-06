export type AgentStatus = "idle" | "thinking" | "working" | "completed" | "error";

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

let emit: EmitFn = () => {};

const taskQueue: TaskRequest[] = [];
let processing = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatLogLine = (message: string) => {
  const time = new Date().toLocaleTimeString();
  return `업무 로그 ${time} ${message}`;
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
  emitLog("서버: 사장 대시보드 연결됨");
};
