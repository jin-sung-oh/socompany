import type { Message } from "../../stores/useChatStore";
import type { AgentState } from "../../stores/useAgentStore";
import { EmptyState } from "../components/EmptyState";
import { TypingIndicator } from "../components/TypingIndicator";

type OfficeConversationPanelProps = {
  open: boolean;
  preview: boolean;
  agent: AgentState | null;
  messages: Message[];
  input: string;
  loading: boolean;
  error: string | null;
  locationLabel?: string | null;
  proximityLabel?: string | null;
  proximityVolume?: number | null;
  emptyDescription?: string;
  previewEmptyDescription?: string;
  previewTitle?: string;
  previewHint?: string;
  startButtonLabel?: string;
  inputPlaceholder?: string;
  onChangeInput: (value: string) => void;
  onStartConversation: () => void;
  onClose: () => void;
  onSend: () => void;
};

export function OfficeConversationPanel({
  open,
  preview,
  agent,
  messages,
  input,
  loading,
  error,
  locationLabel,
  proximityLabel,
  proximityVolume,
  emptyDescription,
  previewEmptyDescription,
  previewTitle,
  previewHint,
  startButtonLabel,
  inputPlaceholder,
  onChangeInput,
  onStartConversation,
  onClose,
  onSend,
}: OfficeConversationPanelProps) {
  return (
    <div className={`spatial-office-conversation${open ? " open" : ""}`}>
      <div className="spatial-office-conversation-head">
        <div>
          <strong>{agent ? `${agent.name} Conversation` : "Conversation"}</strong>
          <span>{agent?.role ?? "NPC not selected"}</span>
        </div>
        <button type="button" className="spatial-office-close-button" onClick={onClose}>
          닫기
        </button>
      </div>

      {agent && (
        <div className="spatial-office-conversation-meta">
          <span>{locationLabel ?? "위치 정보 없음"}</span>
          <span>{proximityLabel ?? "근접 채널 대기"}</span>
          <span>{typeof proximityVolume === "number" ? `Voice ${proximityVolume}%` : "Voice 채널 없음"}</span>
        </div>
      )}

      {typeof proximityVolume === "number" && (
        <div className="spatial-office-audio-meter" aria-label="spatial audio strength">
          <div className="spatial-office-audio-meter-fill" style={{ width: `${proximityVolume}%` }} />
        </div>
      )}

      <div className="spatial-office-conversation-body">
        {messages.length === 0 ? (
          <EmptyState
            description={
              preview
                ? previewEmptyDescription ?? "가까이 오면 채널이 열립니다. 아래 버튼으로 바로 대화를 시작하세요."
                : emptyDescription ?? "Space로 대화를 연 뒤 첫 메시지를 보내세요."
            }
            className="spatial-office-conversation-empty"
            compact
          />
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`spatial-office-chat-bubble ${message.role}`}>
              <div>{message.content}</div>
              <time>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          ))
        )}
        {loading && (
          <div className="spatial-office-chat-bubble assistant">
            <TypingIndicator compact label={`${agent?.name ?? "Agent"} 응답 중`} />
          </div>
        )}
      </div>

      {error && <div className="spatial-office-conversation-error">{error}</div>}

      {preview ? (
        <div className="spatial-office-conversation-preview">
          <div>
            <strong>{previewTitle ?? (agent ? `${agent.name}와 근접 채널 연결됨` : "근접 채널 대기")}</strong>
            <span>{previewHint ?? "Space를 누르거나 아래 버튼으로 입력 모드로 전환할 수 있습니다."}</span>
          </div>
          <button type="button" onClick={onStartConversation} disabled={!agent}>
            {startButtonLabel ?? "대화 시작"}
          </button>
        </div>
      ) : (
        <div className="spatial-office-conversation-input">
          <textarea
            value={input}
            onChange={(event) => onChangeInput(event.target.value)}
            placeholder={inputPlaceholder ?? "근처 NPC에게 메시지를 보내세요."}
            rows={2}
          />
          <button type="button" onClick={onSend} disabled={!agent || !input.trim() || loading}>
            전송
          </button>
        </div>
      )}
    </div>
  );
}
