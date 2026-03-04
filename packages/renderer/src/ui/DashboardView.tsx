import { useEffect, useMemo, useCallback, memo } from "react";
import { SettingsPanel } from "./SettingsPanel";
import { useAgentStore } from "../stores/useAgentStore";
import { useLogStore } from "../stores/useLogStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import {
  LayoutDashboard,
  Users,
  Terminal,
  Activity,
  Settings as SettingsIcon,
  Search,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

const statusCycle: Array<"idle" | "thinking" | "working" | "completed"> = [
  "idle",
  "thinking",
  "working",
  "completed"
];

// Memoized StatusIcon component for performance
const StatusIcon = memo(({ status }: { status: string }) => {
  switch (status) {
    case "working":
      return <Activity className="w-4 h-4 text-orange-500 animate-pulse" />;
    case "thinking":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
});

export const DashboardView = () => {
  const agents = useAgentStore((state) => state.agents);
  const setAgents = useAgentStore((state) => state.setAgents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const logs = useLogStore((state) => state.logs);
  const addLog = useLogStore((state) => state.addLog);
  const { settings, load: loadSettings } = useSettingsStore();
  const { t } = useTranslation();

  // Memoize sorted agents to prevent unnecessary re-sorting
  const sortedAgents = useMemo(() =>
    [...agents].sort((a, b) => a.name.localeCompare(b.name)),
    [agents]
  );

  // Memoize reversed logs
  const reversedLogs = useMemo(() =>
    [...logs].reverse(),
    [logs]
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings.agents.length > 0) {
      setAgents(settings.agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: a.status as any
      })));
    }
  }, [settings.agents, setAgents]);

  // DEVELOPMENT ONLY: Simulate agent status changes
  // TODO: Replace with real agent status updates when backend is ready
  useEffect(() => {
    const timer = window.setInterval(() => {
      addLog(`Log entry ${new Date().toLocaleTimeString()}`);
      const first = agents[0];
      if (first) {
        const current = statusCycle.indexOf(first.status as any);
        const nextStatus = statusCycle[(current + 1) % statusCycle.length];
        updateAgentStatus(first.id, nextStatus as any);
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [addLog, agents, updateAgentStatus]);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="logo-icon" aria-label="KAFI logo">K</div>
          <span>KAFI</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className="nav-item active"
            aria-current="page"
            aria-label={t("dashboard.title")}
          >
            <LayoutDashboard size={20} aria-hidden="true" />
            <span>{t("dashboard.title")}</span>
          </button>
          <button
            className="nav-item"
            aria-label="Agents"
          >
            <Users size={20} aria-hidden="true" />
            <span>{t("dashboard.agent_status").split(" ")[0]}</span>
          </button>
          <button
            className="nav-item"
            aria-label="Logs"
          >
            <Terminal size={20} aria-hidden="true" />
            <span>{t("dashboard.recent_logs").split(" ")[1]}</span>
          </button>
          <button
            className="nav-item mt-auto"
            aria-label={t("settings.title")}
          >
            <SettingsIcon size={20} aria-hidden="true" />
            <span>{t("settings.title")}</span>
          </button>
        </nav>
      </aside>

      <main className="dashboard-main" role="main">
        <header className="dashboard-topbar">
          <div className="search-bar" role="search">
            <Search size={18} className="muted" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search dashboard"
            />
          </div>
          <div className="user-profile">
            <div className="avatar-sm" role="img" aria-label="User avatar">SJ</div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-header">
            <div>
              <h1>{t("dashboard.agent_status")}</h1>
              <p className="subtitle">{t("dashboard.subtitle")}</p>
            </div>
            <div className="header-actions">
              <button className="primary-btn" aria-label="Invite new agent">
                Invite Agent
              </button>
            </div>
          </section>

          <div className="dashboard-grid">
            <div className="card agent-card">
              <div className="card-header">
                <Users size={20} aria-hidden="true" />
                <h2>{t("dashboard.agent_status")}</h2>
              </div>
              {sortedAgents.length === 0 ? (
                <div className="empty-agents-message">
                  <Users size={48} className="muted" style={{ margin: "0 auto var(--space-4)" }} />
                  <p style={{ marginBottom: "var(--space-4)" }}>No agents configured yet.</p>
                  <button className="primary-btn">Add Your First Agent</button>
                </div>
              ) : (
                <ul className="agent-list">
                  {sortedAgents.map((agent) => (
                    <li key={agent.id} className="agent-item">
                      <div className="agent-info">
                        <div
                          className={`agent-avatar-bg ${agent.status}`}
                          role="img"
                          aria-label={`${agent.name} status: ${agent.status}`}
                        >
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <strong>{agent.name}</strong>
                          <span className="muted">{agent.role}</span>
                        </div>
                      </div>
                      <div className={`status-tag ${agent.status}`} aria-label={`Status: ${t(`dashboard.status.${agent.status}`)}`}>
                        <StatusIcon status={agent.status} />
                        <span>{t(`dashboard.status.${agent.status}`)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card board-card">
              <div className="card-header">
                <Activity size={20} />
                <h2>{t("dashboard.team_board")}</h2>
              </div>
              <div className="board-columns">
                <div className="board-col">
                  <h3>{t("dashboard.status.idle")}</h3>
                  <div className="board-item">Log Analysis</div>
                </div>
                <div className="board-col">
                  <h3>{t("dashboard.status.working")}</h3>
                  <div className="board-item highlight">Review Guide</div>
                </div>
                <div className="board-col">
                  <h3>{t("dashboard.status.completed")}</h3>
                  <div className="board-item dim">Test Report</div>
                </div>
              </div>
            </div>

            <div className="card log-card">
              <div className="card-header">
                <Terminal size={20} aria-hidden="true" />
                <h2>{t("dashboard.recent_logs")}</h2>
              </div>
              <div className="log-panel" role="log" aria-label="System logs" aria-live="polite">
                {logs.length === 0 ? (
                  <p className="muted text-center">No logs yet.</p>
                ) : (
                  reversedLogs.map((line, index) => (
                    <div key={`${line}-${index}`} className="log-line">
                      <span className="log-timestamp">{line.split(" ")[2]}</span>
                      <span className="log-msg">{line}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card settings-card">
              <SettingsPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
