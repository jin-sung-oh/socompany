import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { DashboardView } from "./DashboardView";
import { WidgetView } from "./WidgetView";
import { useAgentStore, AgentSummary } from "../stores/useAgentStore";
import { useLogStore } from "../stores/useLogStore";

const getViewMode = () => {
  const hash = window.location.hash.replace("#", "");
  if (hash === "widget") {
    return "widget" as const;
  }
  return "dashboard" as const;
};

export const App = () => {
  const viewMode = useMemo(getViewMode, []);
  const setAgents = useAgentStore((state) => state.setAgents);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const addLog = useLogStore((state) => state.addLog);

  useEffect(() => {
    let socket: Socket | null = null;
    let fallbackActive = false;
    let unsubAgents: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;
    let fallbackTimer: number | undefined;

    const startFallback = async () => {
      if (fallbackActive) {
        return;
      }
      fallbackActive = true;
      if (!window.kafi) {
        return;
      }
      const agents = await window.kafi.getAgents();
      setAgents(agents);
      unsubAgents = window.kafi.subscribeAgents(setAgents);
      unsubLogs = window.kafi.subscribeLogs(addLog);
    };

    const connectSocket = () => {
      socket = io("http://localhost:3001", {
        transports: ["websocket"],
        timeout: 1200
      });

      socket.on("connect", () => {
        if (fallbackActive) {
          unsubAgents?.();
          unsubLogs?.();
          fallbackActive = false;
        }
      });

      socket.on("connect_error", () => {
        void startFallback();
      });

      socket.on("agent:list", (payload: { agents?: AgentSummary[] }) => {
        if (payload && Array.isArray(payload.agents)) {
          setAgents(payload.agents);
        }
      });

      socket.on("agent:status", (payload: { id?: string; status?: AgentSummary["status"] }) => {
        if (payload?.id && payload?.status) {
          updateAgentStatus(payload.id, payload.status);
        }
      });

      socket.on("log:line", (line: string) => {
        addLog(line);
      });

      fallbackTimer = window.setTimeout(() => {
        if (socket && !socket.connected) {
          void startFallback();
        }
      }, 1200);
    };

    connectSocket();

    return () => {
      socket?.disconnect();
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
      unsubAgents?.();
      unsubLogs?.();
    };
  }, [addLog, setAgents, updateAgentStatus]);

  return viewMode === "widget" ? <WidgetView /> : <DashboardView />;
};
