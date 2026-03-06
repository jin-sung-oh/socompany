import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, AlertCircle, Sparkles } from "lucide-react";
import { useAgentStore } from "../stores/useAgentStore";
import { useChatStore } from "../stores/useChatStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import { getAgentAsset, getSpeciesMeta } from "../data/agentCatalog";

const states = ["idle", "thinking", "working", "completed", "error"] as const;
type WidgetState = (typeof states)[number];

export const WidgetView = () => {
  const agents = useAgentStore((state) => state.agents);
  const addMessage = useChatStore((state) => state.addMessage);
  const messagesByAgent = useChatStore((state) => state.messagesByAgent);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const { settings, load: loadSettings } = useSettingsStore();
  const { t } = useTranslation();
  const pmAgent = useMemo(() => agents.find((agent) => agent.role === "PM Agent") ?? agents[0] ?? null, [agents]);
  const species = pmAgent ? getSpeciesMeta(pmAgent.species) : null;
  const [state, setState] = useState<WidgetState>(pmAgent?.status ?? "idle");
  const [inputValue, setInputValue] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = pmAgent ? messagesByAgent[pmAgent.id] ?? [] : [];

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (pmAgent?.status && states.includes(pmAgent.status as WidgetState)) {
      setState(pmAgent.status as WidgetState);
    }
  }, [pmAgent]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat]);

  const handleSend = async () => {
    if (!inputValue.trim() || !window.kafi || isLoading || !pmAgent) {
      return;
    }

    setError(null);
    setIsLoading(true);
    setState("thinking");
    updateAgentStatus(pmAgent.id, "thinking");

    const check = await window.kafi.ollamaCheck();
    if (!check.connected) {
      const disconnected = t("widget.ollama_disconnected");
      setError(disconnected);
      addMessage(pmAgent.id, "assistant", disconnected);
      setState("error");
      updateAgentStatus(pmAgent.id, "error");
      setIsLoading(false);
      return;
    }

    const userMsg = inputValue.trim();
    setInputValue("");
    addMessage(pmAgent.id, "user", userMsg);

    try {
      const result = await window.kafi.ollamaChat({ message: userMsg, agentId: pmAgent.id });
      if (result.success && result.response) {
        addMessage(pmAgent.id, "assistant", result.response);
        setState("completed");
        updateAgentStatus(pmAgent.id, "completed");
      } else {
        const errorMsg = result.error || t("widget.model_not_found");
        setError(errorMsg);
        addMessage(pmAgent.id, "assistant", errorMsg);
        setState("error");
        updateAgentStatus(pmAgent.id, "error");
      }
    } catch (err) {
      const errorMsg = t("widget.chat_error");
      setError(errorMsg);
      addMessage(pmAgent.id, "assistant", errorMsg);
      setState("error");
      updateAgentStatus(pmAgent.id, "error");
    } finally {
      setIsLoading(false);
      window.setTimeout(() => {
        setState("idle");
        updateAgentStatus(pmAgent.id, "idle");
      }, 1000);
    }
  };

  if (!pmAgent || !species) {
    return null;
  }

  return (
    <div className="ceo-widget-shell" style={{ opacity: settings.widgetOpacity / 100 }}>
      <div className="ceo-widget-card">
        <div className="ceo-widget-header">
          <div>
            <p>CEO Hotline</p>
            <strong>{pmAgent.name}</strong>
          </div>
          <div className="ceo-widget-state">{state}</div>
        </div>

        <button type="button" className="ceo-widget-avatar" onClick={() => setShowChat((prev) => !prev)} aria-label={t("widget.click_to_chat")}>
          {getAgentAsset(pmAgent)}
        </button>

        <div className="ceo-widget-footer">
          <span>{species.label} · {pmAgent.role}</span>
          <Sparkles size={14} />
        </div>
      </div>

      {showChat && (
        <div className="ceo-widget-chat" role="dialog" aria-label="PM 빠른 대화">
          <div className="ceo-widget-chat-header">
            <div>
              <strong>{pmAgent.name}</strong>
              <p>사장님의 지시를 PM이 바로 받습니다.</p>
            </div>
            <button type="button" className="icon-btn-sm" onClick={() => setShowChat(false)} aria-label="닫기">
              <X size={14} />
            </button>
          </div>

          <div className="ceo-widget-chat-body">
            {error && (
              <div className="error-box" style={{ marginBottom: "var(--space-2)" }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="ceo-empty-state">PM에게 첫 지시를 내려보세요.</div>
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

          <div className="ceo-widget-chat-input">
            <input
              type="text"
              className="pet-chat-input-v2"
              placeholder="PM에게 작업 지시를 내려보세요"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && void handleSend()}
              disabled={isLoading}
              aria-label="PM 메시지 입력"
            />
            <button type="button" className="send-btn-v2" onClick={() => void handleSend()} disabled={!inputValue.trim() || isLoading} aria-label="전송">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
