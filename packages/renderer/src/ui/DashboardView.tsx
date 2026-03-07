import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, Users, TerminalSquare, Settings2, Activity, AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";
import { OfficeDashboard2D } from "./OfficeDashboard2D";
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

export const DashboardView = () => {
  const agents = useAgentStore((state) => state.agents);
  const setAgents = useAgentStore((state) => state.setAgents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const logs = useLogStore((state) => state.logs);
  const addLog = useLogStore((state) => state.addLog);
  const addMessage = useChatStore((state) => state.addMessage);
  const messagesByAgent = useChatStore((state) => state.messagesByAgent);
  const { settings, load: loadSettings } = useSettingsStore();
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [commandInput, setCommandInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setAgents(normalizeAgents(settings.agents));
  }, [setAgents, settings.agents]);

  const pmAgent = useMemo(() => agents.find((agent) => agent.role === "PM Agent") ?? agents[0] ?? null, [agents]);
  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? pmAgent, [agents, pmAgent, selectedAgentId]);
  const activeAgentId = selectedAgent?.id ?? "default";
  const messages = messagesByAgent[activeAgentId] ?? [];
  const latestLog = logs[0] ?? "사장님의 첫 지시를 기다리는 중입니다.";
  const visibleLogs = useMemo(() => logs.slice(0, 8), [logs]);
  const workflowSummarySource = workflowRun?.finalReport ?? workflowRun?.pmBriefing ?? "";
  const statusSummary = useMemo(
    () => ({
      total: agents.length,
      working: agents.filter((agent) => agent.status === "working").length,
      thinking: agents.filter((agent) => agent.status === "thinking").length,
      completed: agents.filter((agent) => agent.status === "completed").length,
    }),
    [agents],
  );

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
    setWorkflowRun((prev) => {
      if (!prev) {
        return prev;
      }

      return {
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
      };
    });
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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeAgentId]);

  const handleSend = async () => {
    if (!commandInput.trim() || !window.kafi || isLoading || !pmAgent) {
      return;
    }

    const userMsg = commandInput.trim();
    const nextWorkflow: WorkflowRun = {
      command: userMsg,
      startedAt: Date.now(),
      phase: "briefing",
      assignments: buildWorkflowAssignments(agents, userMsg),
    };

    setError(null);
    setIsLoading(true);
    setSelectedAgentId(pmAgent.id);
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
      setWorkflowRun((prev) => (prev ? { ...prev, phase: "error", finalReport: disconnected } : prev));
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
        setWorkflowRun((prev) => (prev ? { ...prev, phase: "error", finalReport: errorMsg } : prev));
        return;
      }

      addMessage(pmAgent.id, "assistant", pmBrief.response);
      updateAgentStatus(pmAgent.id, "completed");
      setAgentTask(pmAgent.id, "사장 지시 분석 및 팀 분배", "done");
      addLog(formatWorkflowLogLine(`${pmAgent.name}: 팀 분배 브리프 작성 완료`));
      setWorkflowRun((prev) => (prev ? { ...prev, phase: "execution", pmBriefing: pmBrief.response } : prev));

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

      setWorkflowRun((prev) => (prev ? { ...prev, phase: "reporting", assignments: completedAssignments } : prev));
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
        setWorkflowRun((prev) =>
          prev
            ? {
                ...prev,
                phase: "completed",
                finalReport: finalReport.response,
                assignments: completedAssignments,
              }
            : prev,
        );
      } else {
        setError(finalResponseText);
        updateAgentStatus(pmAgent.id, "error");
        setAgentTask(pmAgent.id, "팀 결과 취합 및 사장 보고", "todo");
        setWorkflowRun((prev) => (prev ? { ...prev, phase: "error", finalReport: finalResponseText } : prev));
      }
    } catch {
      const errorMsg = t("widget.chat_error");
      setError(errorMsg);
      addMessage(pmAgent.id, "assistant", errorMsg);
      updateAgentStatus(pmAgent.id, "error");
      setWorkflowRun((prev) => (prev ? { ...prev, phase: "error", finalReport: errorMsg } : prev));
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
              <h2>Gather Town 스타일 오피스</h2>
            </div>
            <Users size={18} />
          </div>
          <p className="ceo-panel-note">미니미들이 사무실을 돌아다니다가, 지시가 들어오면 자기 자리로 이동해 일합니다. 사원을 클릭하면 해당 기록을 바로 볼 수 있습니다.</p>
          <OfficeDashboard2D embedded selectedAgentId={selectedAgent?.id ?? null} onSelectAgent={setSelectedAgentId} />
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
                <div className="ceo-empty-state">PM이 아직 팀 분배를 시작하지 않았습니다.</div>
              )}
            </div>
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
          <div className="ceo-chat-stream">
            {messages.length === 0 ? (
              <div className="ceo-empty-state">선택한 에이전트와 아직 작업 기록이 없습니다. 워크플로우를 시작하거나 다른 팀원을 선택하세요.</div>
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
                <div className="flex items-center gap-1">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
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
              <div className="ceo-empty-state">아직 로그가 없습니다.</div>
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
