import type { Agent } from "@kafi/shared";

export type WorkflowAssignmentStatus = "queued" | "running" | "done" | "error";

export type WorkflowAssignment = {
  agentId: string;
  agentName: string;
  role: string;
  title: string;
  instruction: string;
  status: WorkflowAssignmentStatus;
  response?: string;
};

export type WorkflowPhase = "briefing" | "execution" | "reporting" | "completed" | "error";

export type WorkflowRun = {
  command: string;
  startedAt: number;
  phase: WorkflowPhase;
  pmBriefing?: string;
  finalReport?: string;
  assignments: WorkflowAssignment[];
};

const workflowRoleOrder = [
  "Research Agent",
  "Trend Agent",
  "Planning Agent",
  "Document Agent",
  "Coding Agent",
  "Test Agent",
] as const;

const workflowRoleTemplates: Record<string, { title: string; instruction: string }> = {
  "Research Agent": {
    title: "핵심 자료와 근거 조사",
    instruction: "사장 요청의 배경, 핵심 사실, 참고해야 할 근거를 정리하세요.",
  },
  "Trend Agent": {
    title: "최신 흐름과 변화 포착",
    instruction: "최근 흐름, 시장 분위기, 주목할 변화를 요약하세요.",
  },
  "Planning Agent": {
    title: "실행 구조와 우선순위 설계",
    instruction: "실행 단계를 쪼개고 우선순위와 의존 관계를 정리하세요.",
  },
  "Document Agent": {
    title: "산출물 구조화 및 문서 초안",
    instruction: "보고서나 문서로 옮길 수 있게 구조와 목차를 정리하세요.",
  },
  "Coding Agent": {
    title: "구현 범위와 기술 접근 정리",
    instruction: "구현이 필요한 경우 기술 접근, 변경 범위, 주의점을 정리하세요.",
  },
  "Test Agent": {
    title: "검증 포인트와 테스트 시나리오",
    instruction: "검증 기준, 실패 가능성, 테스트 시나리오를 정리하세요.",
  },
};

const getRoleTemplate = (role: string) =>
  workflowRoleTemplates[role] ?? {
    title: `${role} 실행 브리프`,
    instruction: "현재 역할 기준으로 이번 요청에서 처리해야 할 핵심 작업을 정리하세요.",
  };

const getRoleOrder = (role: string) => {
  const index = workflowRoleOrder.indexOf(role as (typeof workflowRoleOrder)[number]);
  return index === -1 ? workflowRoleOrder.length : index;
};

export const buildWorkflowAssignments = (agents: Agent[], command: string): WorkflowAssignment[] =>
  [...agents]
    .filter((agent) => agent.role !== "PM Agent")
    .sort((left, right) => getRoleOrder(left.role) - getRoleOrder(right.role))
    .map((agent) => {
      const template = getRoleTemplate(agent.role);
      return {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        title: template.title,
        instruction: `${template.instruction}\n사장 지시 원문: ${command}`,
        status: "queued",
      };
    });

export const buildPmBriefPrompt = (command: string) =>
  [
    "사장이 새로운 지시를 내렸습니다.",
    `사장 지시: ${command}`,
    "당신은 PM Agent입니다. 팀에 업무를 분배하기 전, 실무형 브리프를 작성하세요.",
    "다음 형식을 반드시 지키세요.",
    "1. 목표",
    "2. 가장 먼저 확인할 포인트",
    "3. 역할별 분배 메모 (Research Agent, Trend Agent, Planning Agent, Document Agent, Coding Agent, Test Agent)",
    "4. 사장에게 선제적으로 공유할 리스크",
    "항상 한국어로, 군더더기 없이 작성하세요.",
  ].join("\n");

export const buildAgentWorkflowPrompt = (command: string, pmBriefing: string, assignment: WorkflowAssignment) =>
  [
    `사장 지시: ${command}`,
    `PM 브리프:\n${pmBriefing}`,
    `당신의 담당 작업: ${assignment.title}`,
    `세부 지시:\n${assignment.instruction}`,
    "이번 보고는 PM Agent에게 전달될 중간 결과입니다.",
    "다음 형식을 반드시 지키세요.",
    "1. 핵심 판단",
    "2. 실행 결과 또는 제안",
    "3. 다음 단계 메모",
    "4. 리스크 또는 확인 필요 사항",
    "항상 한국어로 답변하세요.",
  ].join("\n");

export const buildPmFinalPrompt = (command: string, pmBriefing: string, assignments: WorkflowAssignment[]) => {
  const assignmentResults = assignments
    .map((assignment) =>
      [
        `${assignment.agentName} (${assignment.role})`,
        `담당 작업: ${assignment.title}`,
        `상태: ${getWorkflowStatusLabel(assignment.status)}`,
        `보고 내용:\n${assignment.response ?? "보고 없음"}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `사장 지시: ${command}`,
    `초기 PM 브리프:\n${pmBriefing}`,
    `팀별 중간 결과:\n${assignmentResults}`,
    "당신은 PM Agent로서 사장에게 최종 보고를 작성합니다.",
    "다음 형식을 반드시 지키세요.",
    "1. 진행 요약",
    "2. 팀별 핵심 산출물",
    "3. 바로 실행할 다음 액션",
    "4. 사장 결정이 필요한 항목",
    "항상 한국어로 답변하세요.",
  ].join("\n");
};

export const getWorkflowPhaseLabel = (phase: WorkflowPhase) => {
  switch (phase) {
    case "briefing":
      return "PM 분석 및 분배";
    case "execution":
      return "팀 실행 중";
    case "reporting":
      return "PM 최종 보고 정리";
    case "completed":
      return "보고 완료";
    case "error":
      return "워크플로우 오류";
    default:
      return "대기";
  }
};

export const getWorkflowStatusLabel = (status: WorkflowAssignmentStatus) => {
  switch (status) {
    case "running":
      return "진행 중";
    case "done":
      return "완료";
    case "error":
      return "문제 발생";
    default:
      return "대기";
  }
};

export const formatWorkflowLogLine = (message: string) => `업무 로그 ${new Date().toLocaleTimeString()} ${message}`;

export const summarizeText = (value: string, maxLength = 180) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
};
