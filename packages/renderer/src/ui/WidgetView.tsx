import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useAgentStore } from "../stores/useAgentStore";
import { useChatStore } from "../stores/useChatStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import { Capybara3D } from "./Capybara3D";
import { CapybaraAvatar } from "./CapybaraAvatar";
import { X, Send, Trash2, AlertCircle } from "lucide-react";

const states = ["idle", "thinking", "working", "completed"] as const;

type WidgetState = (typeof states)[number];

export const WidgetView = () => {
  const agents = useAgentStore((state) => state.agents);
  const { messages, addMessage, clearHistory } = useChatStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const { t } = useTranslation();
  const [state, setState] = useState<WidgetState>(agents[0]?.status ?? "idle");
  const [inputValue, setInputValue] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Memoized checkOllama function
  const checkOllama = useCallback(async () => {
    if (!window.kafi?.ollamaCheck) return;
    const result = await window.kafi.ollamaCheck();
    setIsOllamaAvailable(result.connected);
  }, []);

  useEffect(() => {
    void loadSettings();
    checkOllama();
  }, [loadSettings, checkOllama]);

  useEffect(() => {
    if (agents[0]?.status) {
      setState(agents[0].status as WidgetState);
    }
  }, [agents]);

  useEffect(() => {
    if (showChat) {
      scrollToBottom();
    }
  }, [showChat, messages]);

  // Memoized scroll function
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Memoized send handler with loading state and error handling
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !window.kafi || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Check connection
    const check = await window.kafi.ollamaCheck();
    if (!check.connected) {
      setIsOllamaAvailable(false);
      setError(t("widget.ollama_disconnected"));
      addMessage("assistant", t("widget.ollama_disconnected"));
      setIsLoading(false);
      return;
    }

    const userMsg = inputValue;
    setInputValue("");
    addMessage("user", userMsg);
    setState("thinking");

    try {
      const result = await window.kafi.ollamaChat(userMsg);

      if (result.success && result.response) {
        addMessage("assistant", result.response);
        setState("completed");
        setError(null);
      } else {
        const errorMsg = result.error || t("widget.model_not_found");
        setError(errorMsg);
        addMessage("assistant", errorMsg);
        setState("idle");
      }
    } catch (err) {
      const errorMsg = t("widget.chat_error");
      setError(errorMsg);
      addMessage("assistant", errorMsg);
      setState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, addMessage, t, setState]);

  // Memoized toggle chat handler
  const toggleChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowChat(prev => !prev);
    setError(null);
    // Click feedback animation
    if (!showChat) {
      setState("working");
      setTimeout(() => setState("idle"), 500);
    }
  }, [showChat]);

  // Helper function to format timestamp
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <div style={{
      width: '250px',
      height: '250px',
      background: 'linear-gradient(135deg, #fef9f3, #f9e4c7)',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: settings.widgetOpacity / 100,
      position: 'relative'
    }}>
      {/* 카피바라 표시 */}
      <div
        onClick={toggleChat}
        style={{
          fontSize: '120px',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        title={t("widget.click_to_chat")}
      >
        🦫
      </div>

      {/* 채팅 말풍선 */}
      {showChat && (
        <div className="chat-bubble-container" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Chat interface">
          <div className="chat-bubble-v2">
            <div className="chat-messages-container">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
                <button
                  className="icon-btn-sm"
                  onClick={() => setShowChat(false)}
                  aria-label="Close chat"
                  title={t("widget.close") || "Close"}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Error banner */}
              {error && (
                <div className="error-box" style={{ marginBottom: 'var(--space-2)' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="empty-chat" role="status">
                  {t("widget.empty_chat")}
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                      <div className="message-bubble">
                        <div>{msg.content}</div>
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)',
                          marginTop: 'var(--space-1)',
                          textAlign: msg.role === 'user' ? 'right' : 'left'
                        }}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div className="chat-message-row assistant">
                      <div className="message-bubble">
                        <div className="flex items-center gap-1">
                          <span className="animate-pulse">●</span>
                          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                          <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                className="pet-chat-input-v2"
                placeholder={t("widget.chat_placeholder")}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={isLoading}
                aria-label="Message input"
              />
              <button
                className="send-btn-v2"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
