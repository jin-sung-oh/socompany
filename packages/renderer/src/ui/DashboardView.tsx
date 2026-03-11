import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, Users, TerminalSquare, Settings2, Activity, AlertTriangle, CheckCircle2, Clock3, Loader2, FileText } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";
import { OfficeDashboard2D } from "./OfficeDashboard2D";
import { OfficeDashboard3D } from "./OfficeDashboard3D";
import { EmptyState } from "./components/EmptyState";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { TypingIndicator } from "./components/TypingIndicator";
import { useAgentStore } from "../stores/useAgentStore";
import { useLogStore } from "../stores/useLogStore";
import { useChatStore } from "../stores/useChatStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import { getSpeciesMeta, normalizeAgents } from "../data/agentCatalog";
import { getSeatByRole } from "../data/officeLayout";
import {
  buildAgentWorkflowPrompt,
  buildPmBriefPrompt,
  buildPmFinalPrompt,
  buildWorkflowAssignments,
  formatWorkflowLogLine,
  getWorkflowPhaseLabel,
  getWorkflowStatusLabel,
  summarizeText,
  type WorkflowAssignment,
  type WorkflowRun,
} from "../workflow/ceoWorkflow";

const quickCommands = [
  "이번 작업을 PM 기준으로 분해해서 팀에 배정해줘.",
  "Research Agent와 Trend Agent가 먼저 조사할 포인트를 정리해줘.",
  "Planning Agent 기준으로 실행 순서와 우선순위를 짜줘.",
  "Document Agent가 바로 문서화할 수 있게 목차를 만들어줘.",
];

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "working":
      return <Activity size={16} />;
    case "thinking":
      return <Loader2 size={16} className="animate-spin" />;
    case "completed":
      return <CheckCircle2 size={16} />;
    case "error":
      return <AlertTriangle size={16} />;
    default:
      return <Clock3 size={16} />;
  }
};

const taskStatusLabel: Record<"todo" | "doing" | "done", string> = {
  todo: "대기",
  doing: "진행 중",
  done: "완료",
};

const workflowHistoryLimit = 8;

const workflowPhaseSteps = ["briefing", "execution", "reporting", "completed"] as const;

type WorkflowPhaseStep = (typeof workflowPhaseSteps)[number];

const workflowPhaseIndex: Record<WorkflowPhaseStep, number> = {
  briefing: 0,
  execution: 1,
  reporting: 2,
  completed: 3,
};

const workflowPhaseDescription: Record<WorkflowPhaseStep, string> = {
  briefing: "PM이 사장 지시를 해석하고 팀 브리프를 만듭니다.",
  execution: "역할별 에이전트가 순차적으로 중간 결과를 제출합니다.",
  reporting: "PM이 팀 결과를 취합해 최종 보고를 정리합니다.",
  completed: "사장이 확인할 최종 산출물이 정리된 상태입니다.",
};

const formatWorkflowDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getWorkflowPhaseProgressIndex = (run: WorkflowRun) => {
  switch (run.phase) {
    case "execution":
      return 1;
    case "reporting":
      return 2;
    case "completed":
      return 3;
    case "error":
      if (run.finalReport) {
        return 2;
      }
      if (run.assignments.some((assignment) => assignment.status !== "queued")) {
        return 1;
      }
      return 0;
    case "briefing":
    default:
      return 0;
  }
};

const getWorkflowStepTone = (run: WorkflowRun, step: WorkflowPhaseStep) => {
  const stepIndex = workflowPhaseIndex[step];
  const progressIndex = getWorkflowPhaseProgressIndex(run);

  if (run.phase === "completed") {
    return "done";
  }

  if (stepIndex < progressIndex) {
    return "done";
  }

  if (stepIndex === progressIndex) {
    return run.phase === "error" ? "error" : "active";
  }

  return "upcoming";
};

const getWorkflowRunTone = (run: WorkflowRun) => {
  if (run.phase === "error") {
    return "error";
  }

  if (run.phase === "completed") {
    return "done";
  }

  return "active";
};

const getWorkflowRunPreview = (run: WorkflowRun) =>
  summarizeText(run.finalReport ?? run.pmBriefing ?? run.assignments.find((assignment) => assignment.response)?.response ?? "브리프 생성 전입니다.", 140);

export const DashboardView = () => {
  const agents = useAgentStore((state) => state.agents);
  const setAgents = useAgentStore((state) => state.setAgents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const logs = useLogStore((state) => state.logs);
  const addLog = useLogStore((state) => state.addLog);
  const addMessage = useChatStore((state) => state.addMessage);
  const messagesByAgent = useChatStore((state) => state.messagesByAgent);
  const settings = useSettingsStore((state) => state.settings);
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [commandInput, setCommandInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowRun[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const chatStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAgents(normalizeAgents(settings.agents));
  }, [setAgents, settings.agents]);

  const pmAgent = useMemo(() => agents.find((agent) => agent.role === "PM Agent") ?? agents[0] ?? null, [agents]);
  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? pmAgent, [agents, pmAgent, selectedAgentId]);
  const activeAgentId = selectedAgent?.id ?? "default";
  const messages = messagesByAgent[activeAgentId] ?? [];
  const latestLog = logs[0] ?? "사장님의 첫 지시를 기다리는 중입니다.";
  const visibleLogs = useMemo(() => logs.slice(0, 8), [logs]);
  const show3DOffice = settings.characterType === "3d";
  const officeSelectionId = selectedAgentId || null;
  const workflowSummarySource = workflowRun?.finalReport ?? workflowRun?.pmBriefing ?? "";
  const selectedWorkflowRun = useMemo(() => {
    if (selectedWorkflowId && workflowRun?.id === selectedWorkflowId) {
      return workflowRun;
    }

    return workflowHistory.find((run) => run.id === selectedWorkflowId) ?? workflowRun ?? workflowHistory[0] ?? null;
  }, [selectedWorkflowId, workflowHistory, workflowRun]);
  const selectedWorkflowAssignmentStats = useMemo(() => {
    if (!selectedWorkflowRun) {
      return {
        total: 0,
        done: 0,
        running: 0,
        error: 0,
      };
    }

    return {
      total: selectedWorkflowRun.assignments.length,
      done: selectedWorkflowRun.assignments.filter((assignment) => assignment.status === "done").length,
      running: selectedWorkflowRun.assignments.filter((assignment) => assignment.status === "running").length,
      error: selectedWorkflowRun.assignments.filter((assignment) => assignment.status === "error").length,
    };
  }, [selectedWorkflowRun]);
  const statusSummary = useMemo(
    () => ({
      total: agents.length,
      working: agents.filter((agent) => agent.status === "working").length,
      thinking: agents.filter((agent) => agent.status === "thinking").length,
      completed: agents.filter((agent) => agent.status === "completed").length,
    }),
    [agents],
  );

  useEffect(() => {
    if (!workflowRun) {
      return;
    }

    setWorkflowHistory((prev) => [workflowRun, ...prev.filter((run) => run.id !== workflowRun.id)].slice(0, workflowHistoryLimit));
  }, [workflowRun]);

  useEffect(() => {
    if (!selectedWorkflowId && workflowHistory.length > 0) {
      setSelectedWorkflowId(workflowHistory[0].id);
    }
  }, [selectedWorkflowId, workflowHistory]);

  const patchWorkflowRun = (updater: (prev: WorkflowRun) => WorkflowRun) => {
    setWorkflowRun((prev) => (prev ? updater(prev) : prev));
  };

  const resetWorkflowAgentState = () => {
    agents.forEach((agent) => {
      updateAgentStatus(agent.id, "idle");
      updateAgent(agent.id, { currentTask: null });
    });
  };

  const setAgentTask = (agentId: string, title: string, status: "todo" | "doing" | "done") => {
    updateAgent(agentId, {
      currentTask: {
        id: `${agentId}-${Date.now()}`,
        title,
        status,
      },
    });
  };

  const moveAgentToWorkspace = (agentId: string, role: string) => {
    const seat = getSeatByRole(role);
    if (!seat) {
      return;
    }
    updateAgent(agentId, {
      targetPosition: { x: seat.x, y: seat.y },
      behavior: "wandering",
    });
  };

  const setWorkflowAssignmentState = (agentId: string, status: WorkflowAssignment["status"], response?: string) => {
    patchWorkflowRun((prev) => ({
      ...prev,
      assignments: prev.assignments.map((assignment) =>
        assignment.agentId === agentId
          ? {
              ...assignment,
              status,
              response: response ?? assignment.response,
            }
          : assignment,
      ),
    }));
  };

  useEffect(() => {
    if (!selectedAgentId && pmAgent) {
      setSelectedAgentId(pmAgent.id);
      return;
    }

    if (selectedAgentId && agents.length > 0 && !agents.find((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(pmAgent?.id ?? agents[0].id);
    }
  }, [agents, pmAgent, selectedAgentId]);

  useEffect(() => {
    if (!chatStreamRef.current) {
      return;
    }

    chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
  }, [messages, activeAgentId]);

  const handleSend = async () => {
    if (!commandInput.trim() || !window.kafi || isLoading || !pmAgent) {
      return;
    }

    const userMsg = commandInput.trim();
    const nextWorkflow: WorkflowRun = {
      id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command: userMsg,
      startedAt: Date.now(),
      phase: "briefing",
      assignments: buildWorkflowAssignments(agents, userMsg),
    };

    setError(null);
    setIsLoading(true);
    setSelectedAgentId(pmAgent.id);
    setSelectedWorkflowId(nextWorkflow.id);
    setCommandInput("");
    setWorkflowRun(nextWorkflow);
    resetWorkflowAgentState();
    addMessage(pmAgent.id, "user", userMsg);
    addLog(formatWorkflowLogLine(`사장 요청 접수: ${userMsg}`));
    updateAgentStatus(pmAgent.id, "thinking");
    setAgentTask(pmAgent.id, "사장 지시 분석 및 팀 분배", "doing");
    moveAgentToWorkspace(pmAgent.id, pmAgent.role);

    const check = await window.kafi.ollamaCheck();
    if (!check.connected) {
      const disconnected = t("widget.ollama_disconnected");
      setError(disconnected);
      addMessage(pmAgent.id, "assistant", disconnected);
      updateAgentStatus(pmAgent.id, "error");
      patchWorkflowRun((prev) => ({ ...prev, phase: "error", finalReport: disconnected, finishedAt: Date.now() }));
      setIsLoading(false);
      return;
    }

    try {
      const pmBrief = await window.kafi.ollamaChat({
        message: buildPmBriefPrompt(userMsg),
        agentId: pmAgent.id,
      });

      if (!pmBrief.success || !pmBrief.response) {
        const errorMsg = pmBrief.error || t("widget.model_not_found");
        setError(errorMsg);
        addMessage(pmAgent.id, "assistant", errorMsg);
        updateAgentStatus(pmAgent.id, "error");
        setAgentTask(pmAgent.id, "사장 지시 분석 및 팀 분배", "todo");
        patchWorkflowRun((prev) => ({ ...prev, phase: "error", finalReport: errorMsg, finishedAt: Date.now() }));
        return;
      }

      addMessage(pmAgent.id, "assistant", pmBrief.response);
      updateAgentStatus(pmAgent.id, "completed");
      setAgentTask(pmAgent.id, "사장 지시 분석 및 팀 분배", "done");
      addLog(formatWorkflowLogLine(`${pmAgent.name}: 팀 분배 브리프 작성 완료`));
      patchWorkflowRun((prev) => ({ ...prev, phase: "execution", pmBriefing: pmBrief.response }));

      const completedAssignments: WorkflowAssignment[] = [];

      for (const assignment of nextWorkflow.assignments) {
        setWorkflowAssignmentState(assignment.agentId, "running");
        updateAgentStatus(assignment.agentId, "working");
        setAgentTask(assignment.agentId, assignment.title, "doing");
        moveAgentToWorkspace(assignment.agentId, assignment.role);
        addMessage(assignment.agentId, "user", `PM 지시: ${assignment.title}\n${assignment.instruction}`);
        addLog(formatWorkflowLogLine(`${assignment.agentName}: ${assignment.title} 착수`));

        const assignmentResult = await window.kafi.ollamaChat({
          message: buildAgentWorkflowPrompt(userMsg, pmBrief.response, assignment),
          agentId: assignment.agentId,
        });

        const responseText = assignmentResult.response || assignmentResult.error || t("widget.chat_error");
        addMessage(assignment.agentId, "assistant", responseText);

        if (assignmentResult.success && assignmentResult.response) {
          updateAgentStatus(assignment.agentId, "completed");
          setAgentTask(assignment.agentId, assignment.title, "done");
          addLog(formatWorkflowLogLine(`${assignment.agentName}: 보고 완료`));
          completedAssignments.push({ ...assignment, status: "done", response: assignmentResult.response });
          setWorkflowAssignmentState(assignment.agentId, "done", assignmentResult.response);
          continue;
        }

        updateAgentStatus(assignment.agentId, "error");
        setAgentTask(assignment.agentId, assignment.title, "todo");
        addLog(formatWorkflowLogLine(`${assignment.agentName}: 보고 실패`));
        completedAssignments.push({ ...assignment, status: "error", response: responseText });
        setWorkflowAssignmentState(assignment.agentId, "error", responseText);
      }

      patchWorkflowRun((prev) => ({ ...prev, phase: "reporting", assignments: completedAssignments }));
      updateAgentStatus(pmAgent.id, "thinking");
      setAgentTask(pmAgent.id, "팀 결과 취합 및 사장 보고", "doing");
      moveAgentToWorkspace(pmAgent.id, pmAgent.role);
      addLog(formatWorkflowLogLine(`${pmAgent.name}: 팀 결과 취합 시작`));

      const finalReport = await window.kafi.ollamaChat({
        message: buildPmFinalPrompt(userMsg, pmBrief.response, completedAssignments),
        agentId: pmAgent.id,
      });

      const finalResponseText = finalReport.response || finalReport.error || t("widget.chat_error");
      addMessage(pmAgent.id, "assistant", finalResponseText);

      if (finalReport.success && finalReport.response) {
        updateAgentStatus(pmAgent.id, "completed");
        setAgentTask(pmAgent.id, "팀 결과 취합 및 사장 보고", "done");
        addLog(formatWorkflowLogLine(`${pmAgent.name}: 최종 보고 완료`));
        patchWorkflowRun((prev) => ({
          ...prev,
          phase: "completed",
          finalReport: finalReport.response,
          assignments: completedAssignments,
          finishedAt: Date.now(),
        }));
      } else {
        setError(finalResponseText);
        updateAgentStatus(pmAgent.id, "error");
        setAgentTask(pmAgent.id, "팀 결과 취합 및 사장 보고", "todo");
        patchWorkflowRun((prev) => ({ ...prev, phase: "error", finalReport: finalResponseText, finishedAt: Date.now() }));
      }
    } catch {
      const errorMsg = t("widget.chat_error");
      setError(errorMsg);
      addMessage(pmAgent.id, "assistant", errorMsg);
      updateAgentStatus(pmAgent.id, "error");
      patchWorkflowRun((prev) => ({ ...prev, phase: "error", finalReport: errorMsg, finishedAt: Date.now() }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ceo-dashboard">
      <div className="ceo-background-orb ceo-background-orb-a" />
      <div className="ceo-background-orb ceo-background-orb-b" />

      <header className="ceo-header">
        <div>
          <p className="ceo-eyebrow">Animal Office</p>
          <h1 className="ceo-title">CEO Command Center</h1>
          <p className="ceo-subtitle">기존 2D/3D 실험 화면을 걷어내고, 사장이 7개 에이전트 팀을 직접 지휘하는 기본 운영 화면부터 다시 시작합니다.</p>
        </div>
        <div className="ceo-badge-row">
          <div className="ceo-badge">사장 모드</div>
          <div className="ceo-badge">PM: {pmAgent?.name ?? "없음"}</div>
        </div>
      </header>

      <section className="ceo-stage-grid">
        <div className="ceo-panel ceo-office-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">Office</p>
              <h2>{show3DOffice ? "3D 커맨드 덱" : "Gather Town 스타일 오피스"}</h2>
            </div>
            <Users size={18} />
          </div>
          <p className="ceo-panel-note">
            {show3DOffice
              ? "2D 오피스와 같은 좌석/상태 데이터를 3D 씬으로 보여줍니다. 사원을 클릭하면 카메라가 해당 자리로 포커스되고, 현재 작업 정보를 바로 볼 수 있습니다."
              : "미니미들이 사무실을 돌아다니다가, 지시가 들어오면 자기 자리로 이동해 일합니다. 사원을 클릭하면 해당 기록을 바로 볼 수 있습니다."}
          </p>
          {show3DOffice ? (
            <OfficeDashboard3D embedded selectedAgentId={officeSelectionId} onSelectAgent={(id) => setSelectedAgentId(id ?? "")} />
          ) : (
            <OfficeDashboard2D embedded selectedAgentId={officeSelectionId} onSelectAgent={(id) => setSelectedAgentId(id ?? "")} />
          )}
        </div>

        <div className="ceo-stage-side">
          <div className="ceo-panel ceo-command-panel">
            <div className="ceo-panel-head">
              <div>
                <p className="ceo-panel-kicker">Command</p>
                <h2>오늘의 지시</h2>
              </div>
              <Sparkles size={18} />
            </div>

            <div className="ceo-quick-actions">
              {quickCommands.map((command) => (
                <button key={command} type="button" className="ceo-quick-button" onClick={() => setCommandInput(command)}>
                  {command}
                </button>
              ))}
            </div>

            <div className="ceo-panel-note">지시는 항상 PM Agent가 받아 전체 팀에 분배합니다. 아래 선택은 각 팀원의 작업 기록을 보는 용도입니다.</div>

            <div className="ceo-agent-selector" role="tablist" aria-label="대화 에이전트 선택">
              {agents.map((agent) => {
                const species = getSpeciesMeta(agent.species);
                const isActive = selectedAgent?.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    className={`ceo-agent-chip ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <span>{species.emoji}</span>
                    <span>{agent.role}</span>
                  </button>
                );
              })}
            </div>

            {error && <div className="ceo-inline-error">{error}</div>}

            <textarea
              className="ceo-command-input"
              value={commandInput}
              onChange={(event) => setCommandInput(event.target.value)}
              placeholder="사장으로서 팀에 내릴 지시를 입력하세요. 예: 이번 주 기능 구현을 위한 조사-기획-문서화-코딩-테스트 흐름을 만들어줘."
              rows={6}
            />

            <div className="ceo-command-footer">
              <div>
                <p className="ceo-footer-label">워크플로우 리드</p>
                <strong>{pmAgent?.name ?? "PM 없음"}</strong>
              </div>
              <button type="button" className="primary-btn ceo-send-button" onClick={() => void handleSend()} disabled={!commandInput.trim() || isLoading || !pmAgent}>
                <Send size={16} />
                <span>{isLoading ? "워크플로우 실행 중" : "워크플로우 시작"}</span>
              </button>
            </div>
          </div>

          <div className="ceo-panel ceo-overview-panel">
            <div className="ceo-panel-head">
              <div>
                <p className="ceo-panel-kicker">Overview</p>
                <h2>오늘의 운영 현황</h2>
              </div>
              <Users size={18} />
            </div>

            <div className="ceo-stat-grid">
              <div className="ceo-stat-card">
                <span>총 인원</span>
                <strong>{statusSummary.total}</strong>
              </div>
              <div className="ceo-stat-card">
                <span>작업 중</span>
                <strong>{statusSummary.working}</strong>
              </div>
              <div className="ceo-stat-card">
                <span>분석 중</span>
                <strong>{statusSummary.thinking}</strong>
              </div>
              <div className="ceo-stat-card">
                <span>완료</span>
                <strong>{statusSummary.completed}</strong>
              </div>
            </div>

            <div className="ceo-focus-card">
              <p className="ceo-panel-kicker">Workflow</p>
              <h3>{workflowRun ? getWorkflowPhaseLabel(workflowRun.phase) : "대기 중"}</h3>
              <p>
                {workflowRun
                  ? summarizeText(workflowRun.command, 150)
                  : pmAgent?.persona?.description ?? "사장의 지시를 받아 팀을 분배할 PM이 아직 없습니다."}
              </p>
              {workflowSummarySource && <div className="ceo-workflow-summary">{summarizeText(workflowSummarySource, 240)}</div>}
            </div>

            <div className="ceo-latest-log">
              <p className="ceo-panel-kicker">Latest Log</p>
              <div>{latestLog}</div>
            </div>

            <div className="ceo-workflow-list">
              {workflowRun?.assignments.length ? (
                workflowRun.assignments.map((assignment) => (
                  <div key={assignment.agentId} className="ceo-workflow-item">
                    <div className="ceo-workflow-item-top">
                      <strong>{assignment.agentName}</strong>
                      <span className={`ceo-task-state ${assignment.status}`}>{getWorkflowStatusLabel(assignment.status)}</span>
                    </div>
                    <span className="ceo-team-meta">{assignment.role}</span>
                    <p>{assignment.title}</p>
                  </div>
                ))
              ) : (
                <EmptyState description="PM이 아직 팀 분배를 시작하지 않았습니다." className="ceo-empty-state" compact />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="ceo-results-grid">
        <div className="ceo-panel ceo-artifact-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">Outputs</p>
              <h2>산출물 패널</h2>
            </div>
            <FileText size={18} />
          </div>

          {selectedWorkflowRun ? (
            <>
              <div className="ceo-artifact-topbar">
                <div>
                  <p className="ceo-panel-kicker">Selected Command</p>
                  <h3>{summarizeText(selectedWorkflowRun.command, 150)}</h3>
                </div>
                <span className={`ceo-run-badge ${getWorkflowRunTone(selectedWorkflowRun)}`}>{getWorkflowPhaseLabel(selectedWorkflowRun.phase)}</span>
              </div>

              <div className="ceo-artifact-meta-grid">
                <div className="ceo-artifact-meta-card">
                  <span>지시 시각</span>
                  <strong>{formatWorkflowDateTime(selectedWorkflowRun.startedAt)}</strong>
                </div>
                <div className="ceo-artifact-meta-card">
                  <span>완료 현황</span>
                  <strong>
                    {selectedWorkflowAssignmentStats.done}/{selectedWorkflowAssignmentStats.total || 0}
                  </strong>
                </div>
                <div className="ceo-artifact-meta-card">
                  <span>이슈</span>
                  <strong>{selectedWorkflowAssignmentStats.error > 0 ? `${selectedWorkflowAssignmentStats.error}건` : "없음"}</strong>
                </div>
                <div className="ceo-artifact-meta-card">
                  <span>마지막 상태</span>
                  <strong>{selectedWorkflowRun.finishedAt ? formatWorkflowDateTime(selectedWorkflowRun.finishedAt) : "진행 중"}</strong>
                </div>
              </div>

              <div className="ceo-phase-track" aria-label="워크플로우 진행 흐름">
                {workflowPhaseSteps.map((step) => (
                  <div key={step} className={`ceo-phase-step ${getWorkflowStepTone(selectedWorkflowRun, step)}`}>
                    <span className="ceo-phase-dot" />
                    <strong>{getWorkflowPhaseLabel(step)}</strong>
                    <p>{workflowPhaseDescription[step]}</p>
                  </div>
                ))}
              </div>

              <div className="ceo-artifact-scroll">
                <div className="ceo-artifact-card">
                  <div className="ceo-artifact-card-head">
                    <div>
                      <p className="ceo-panel-kicker">PM Brief</p>
                      <h3>PM 초기 브리프</h3>
                    </div>
                  </div>
                  <div className="ceo-artifact-body">
                    {selectedWorkflowRun.pmBriefing ? (
                      selectedWorkflowRun.pmBriefing
                    ) : selectedWorkflowRun.phase === "briefing" ? (
                      <LoadingSkeleton compact lines={3} />
                    ) : (
                      "아직 PM 브리프가 생성되지 않았습니다."
                    )}
                  </div>
                </div>

                <div className="ceo-artifact-card">
                  <div className="ceo-artifact-card-head">
                    <div>
                      <p className="ceo-panel-kicker">Final Report</p>
                      <h3>사장 보고서</h3>
                    </div>
                  </div>
                  <div className="ceo-artifact-body">
                    {selectedWorkflowRun.finalReport ? (
                      selectedWorkflowRun.finalReport
                    ) : selectedWorkflowRun.phase === "error" ? (
                      "최종 보고 이전 단계에서 오류가 발생했습니다."
                    ) : (
                      <LoadingSkeleton compact lines={4} />
                    )}
                  </div>
                </div>

                <div className="ceo-artifact-card">
                  <div className="ceo-artifact-card-head">
                    <div>
                      <p className="ceo-panel-kicker">Team Outputs</p>
                      <h3>역할별 중간 산출물</h3>
                    </div>
                  </div>
                  <div className="ceo-artifact-team-grid">
                    {selectedWorkflowRun.assignments.map((assignment) => (
                      <div key={`${selectedWorkflowRun.id}-${assignment.agentId}`} className="ceo-artifact-team-card">
                        <div className="ceo-workflow-item-top">
                          <div>
                            <strong>{assignment.agentName}</strong>
                            <div className="ceo-team-meta">{assignment.role}</div>
                          </div>
                          <span className={`ceo-task-state ${assignment.status}`}>{getWorkflowStatusLabel(assignment.status)}</span>
                        </div>
                        <p className="ceo-artifact-task-title">{assignment.title}</p>
                        <div className="ceo-artifact-body">
                          {assignment.response ? (
                            assignment.response
                          ) : assignment.status === "running" ? (
                            <LoadingSkeleton compact lines={3} />
                          ) : (
                            "아직 보고가 없습니다."
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="산출물 대기"
              description="최근 지시가 아직 없습니다. 워크플로우를 시작하면 PM 브리프와 역할별 산출물이 여기에 정리됩니다."
              className="ceo-empty-state"
            />
          )}
        </div>

        <div className="ceo-panel ceo-history-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">History</p>
              <h2>지시 히스토리</h2>
            </div>
            <Clock3 size={18} />
          </div>
          <p className="ceo-panel-note">최근 지시를 선택하면 해당 실행의 진행 흐름과 산출물을 다시 확인할 수 있습니다.</p>

          <div className="ceo-history-list">
            {workflowHistory.length === 0 ? (
              <EmptyState description="아직 저장된 지시가 없습니다." className="ceo-empty-state" compact />
            ) : (
              workflowHistory.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className={`ceo-history-item ${selectedWorkflowRun?.id === run.id ? "active" : ""}`}
                  onClick={() => setSelectedWorkflowId(run.id)}
                >
                  <div className="ceo-history-item-top">
                    <span className={`ceo-run-badge ${getWorkflowRunTone(run)}`}>{getWorkflowPhaseLabel(run.phase)}</span>
                    <time>{formatWorkflowDateTime(run.startedAt)}</time>
                  </div>
                  <strong>{summarizeText(run.command, 92)}</strong>
                  <div className="ceo-history-item-meta">
                    <span>
                      완료 {run.assignments.filter((assignment) => assignment.status === "done").length}/{run.assignments.length}
                    </span>
                    <span>오류 {run.assignments.filter((assignment) => assignment.status === "error").length}</span>
                  </div>
                  <p>{getWorkflowRunPreview(run)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="ceo-main-grid">
        <div className="ceo-panel ceo-team-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">Team</p>
              <h2>에이전트 팀</h2>
            </div>
            <Users size={18} />
          </div>
          <div className="ceo-team-list">
            {agents.map((agent) => {
              const species = getSpeciesMeta(agent.species);
              return (
                <button key={agent.id} type="button" className={`ceo-team-card ${selectedAgent?.id === agent.id ? "active" : ""}`} onClick={() => setSelectedAgentId(agent.id)}>
                  <div className="ceo-team-card-top">
                    <div className={`agent-avatar-bg ${agent.status}`}>{species.emoji}</div>
                    <div className={`status-tag ${agent.status}`}>
                      <StatusIcon status={agent.status} />
                      <span>{t(`dashboard.status.${agent.status}`)}</span>
                    </div>
                  </div>
                  <strong>{agent.name}</strong>
                  <span className="ceo-team-meta">{species.label} · {agent.role}</span>
                  {agent.currentTask && (
                    <div className={`ceo-task-pill ${agent.currentTask.status}`}>
                      {taskStatusLabel[agent.currentTask.status]} · {agent.currentTask.title}
                    </div>
                  )}
                  <p>{agent.persona?.description ?? "페르소나 설명이 없습니다."}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ceo-panel ceo-chat-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">Conversation</p>
              <h2>{selectedAgent ? `${selectedAgent.name} 작업 기록` : "작업 기록"}</h2>
              {selectedAgent?.currentTask && <div className="ceo-chat-task">{selectedAgent.currentTask.title}</div>}
            </div>
            <TerminalSquare size={18} />
          </div>
          <div className="ceo-chat-stream" ref={chatStreamRef}>
            {messages.length === 0 ? (
              <EmptyState
                description="선택한 에이전트와 아직 작업 기록이 없습니다. 워크플로우를 시작하거나 다른 팀원을 선택하세요."
                className="ceo-empty-state"
              />
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`ceo-chat-bubble ${msg.role}`}>
                  <div>{msg.content}</div>
                  <time>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
              ))
            )}
            {isLoading && (
              <div className="ceo-chat-bubble assistant">
                <TypingIndicator compact tone="accent" label="PM 워크플로우 진행 중" />
              </div>
            )}
          </div>
        </div>

        <div className="ceo-panel ceo-log-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">Ops Log</p>
              <h2>실시간 로그</h2>
            </div>
            <TerminalSquare size={18} />
          </div>
          <div className="ceo-log-list">
            {visibleLogs.length === 0 ? (
              <EmptyState description="아직 로그가 없습니다." className="ceo-empty-state" compact />
            ) : (
              visibleLogs.map((line, index) => (
                <div key={`${line}-${index}`} className="ceo-log-item">
                  <span>{line.split(" ")[2] ?? "--:--:--"}</span>
                  <div>{line}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ceo-panel ceo-settings-panel">
          <div className="ceo-panel-head">
            <div>
              <p className="ceo-panel-kicker">Config</p>
              <h2>팀 설정</h2>
            </div>
            <Settings2 size={18} />
          </div>
          <SettingsPanel />
        </div>
      </section>
    </div>
  );
};
