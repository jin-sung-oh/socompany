import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, Users, TerminalSquare, Settings2, Activity, AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";
import { useAgentStore } from "../stores/useAgentStore";
import { useLogStore } from "../stores/useLogStore";
import { useChatStore } from "../stores/useChatStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import { getSpeciesMeta, normalizeAgents } from "../data/agentCatalog";

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

export const DashboardView = () => {
  const agents = useAgentStore((state) => state.agents);
  const setAgents = useAgentStore((state) => state.setAgents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const logs = useLogStore((state) => state.logs);
  const addMessage = useChatStore((state) => state.addMessage);
  const messagesByAgent = useChatStore((state) => state.messagesByAgent);
  const { settings, load: loadSettings } = useSettingsStore();
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [commandInput, setCommandInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const latestLog = logs[logs.length - 1] ?? "사장님의 첫 지시를 기다리는 중입니다.";
  const visibleLogs = useMemo(() => [...logs].reverse().slice(0, 8), [logs]);
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
    if (!commandInput.trim() || !window.kafi || isLoading || !selectedAgent) {
      return;
    }

    setError(null);
    setIsLoading(true);
    updateAgentStatus(selectedAgent.id, "thinking");

    const check = await window.kafi.ollamaCheck();
    if (!check.connected) {
      const disconnected = t("widget.ollama_disconnected");
      setError(disconnected);
      addMessage(selectedAgent.id, "assistant", disconnected);
      updateAgentStatus(selectedAgent.id, "error");
      setIsLoading(false);
      return;
    }

    const userMsg = commandInput.trim();
    setCommandInput("");
    addMessage(selectedAgent.id, "user", userMsg);

    try {
      const result = await window.kafi.ollamaChat({ message: userMsg, agentId: selectedAgent.id });
      if (result.success && result.response) {
        addMessage(selectedAgent.id, "assistant", result.response);
        updateAgentStatus(selectedAgent.id, "completed");
      } else {
        const errorMsg = result.error || t("widget.model_not_found");
        setError(errorMsg);
        addMessage(selectedAgent.id, "assistant", errorMsg);
        updateAgentStatus(selectedAgent.id, "error");
      }
    } catch (err) {
      const errorMsg = t("widget.chat_error");
      setError(errorMsg);
      addMessage(selectedAgent.id, "assistant", errorMsg);
      updateAgentStatus(selectedAgent.id, "error");
    } finally {
      setIsLoading(false);
      window.setTimeout(() => updateAgentStatus(selectedAgent.id, "idle"), 1200);
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

      <section className="ceo-hero-grid">
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

          <div className="ceo-agent-selector" role="tablist" aria-label="에이전트 선택">
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
            placeholder="사장으로서 팀에 내릴 지시를 입력하세요. 예: PM Agent, 이번 주 기능 구현을 위한 조사-기획-문서화-코딩-테스트 흐름을 만들어줘."
            rows={6}
          />

          <div className="ceo-command-footer">
            <div>
              <p className="ceo-footer-label">현재 대상</p>
              <strong>{selectedAgent?.name ?? "에이전트 없음"}</strong>
            </div>
            <button type="button" className="primary-btn ceo-send-button" onClick={() => void handleSend()} disabled={!commandInput.trim() || isLoading || !selectedAgent}>
              <Send size={16} />
              <span>{isLoading ? "지시 전달 중" : "지시 전달"}</span>
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
            <p className="ceo-panel-kicker">PM Brief</p>
            <h3>{pmAgent?.name ?? "PM 미설정"}</h3>
            <p>{pmAgent?.persona?.description ?? "사장의 지시를 받아 팀을 분배할 PM이 아직 없습니다."}</p>
          </div>

          <div className="ceo-latest-log">
            <p className="ceo-panel-kicker">Latest Log</p>
            <div>{latestLog}</div>
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
              <h2>{selectedAgent ? `${selectedAgent.name} 대화 기록` : "대화 기록"}</h2>
            </div>
            <TerminalSquare size={18} />
          </div>
          <div className="ceo-chat-stream">
            {messages.length === 0 ? (
              <div className="ceo-empty-state">선택한 에이전트와 아직 대화가 없습니다. 위에서 지시를 내려 시작하세요.</div>
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
