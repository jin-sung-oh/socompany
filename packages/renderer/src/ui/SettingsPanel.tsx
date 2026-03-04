import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import { Save, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const SettingsPanel = () => {
  const { settings, status, setSettings, load, save } = useSettingsStore();
  const { t } = useTranslation();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    void load();
    void checkConnection();
  }, [load]);

  const checkConnection = async () => {
    if (!window.kafi?.ollamaCheck) return;
    try {
      const result = await window.kafi.ollamaCheck();
      setIsConnected(result.connected);
      if (result.connected) {
        await fetchModels();
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const fetchModels = async () => {
    if (!window.kafi?.getOllamaModels) return;
    setIsLoadingModels(true);
    try {
      const result = await window.kafi.getOllamaModels();
      if (result.success && result.models) {
        setAvailableModels(result.models.map((m: any) => m.name));
      }
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="card-header">
        <h2>{t("settings.title")}</h2>
      </div>

      <div className="connection-status-bar">
        {isConnected === null ? (
          <span className="status-item"><RefreshCw size={14} className="animate-spin" /> 연결 확인 중...</span>
        ) : isConnected ? (
          <span className="status-item connected"><CheckCircle size={14} /> Ollama 연결됨</span>
        ) : (
          <span className="status-item disconnected"><XCircle size={14} /> Ollama 연결 실패</span>
        )}
        <button className="text-btn" onClick={checkConnection}>재시도</button>
      </div>
      
      {!isConnected && isConnected !== null && (
        <div className="error-box">
          <AlertCircle size={16} />
          <p>Ollama가 실행 중인지 확인해 주세요. <br/> (http://localhost:11434)</p>
        </div>
      )}
      
      <div className="settings-fields">
        <label className="field">
          <span className="label-text">{t("settings.ollama_model")}</span>
          <div className="select-with-action">
            <select
              value={settings.ollamaModel}
              onChange={(event) =>
                setSettings({ ...settings, ollamaModel: event.target.value })
              }
              disabled={isLoadingModels || !isConnected}
            >
              {availableModels.length === 0 ? (
                <option value="">모델을 찾을 수 없음</option>
              ) : (
                <>
                  <option value="">모델 선택...</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button 
              className="icon-btn" 
              onClick={fetchModels} 
              title="새로고침"
              disabled={isLoadingModels || !isConnected}
            >
              <RefreshCw size={16} className={isLoadingModels ? "animate-spin" : ""} />
            </button>
          </div>
        </label>

        <label className="field">
          <span className="label-text">{t("settings.api_key")}</span>
          <input
            type="password"
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={(event) =>
              setSettings({ ...settings, apiKey: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span className="label-text">{t("settings.theme.label")}</span>
          <select
            value={settings.theme}
            onChange={(event) =>
              setSettings({
                ...settings,
                theme: event.target.value as typeof settings.theme
              })
            }
          >
            <option value="system">{t("settings.theme.system")}</option>
            <option value="light">{t("settings.theme.light")}</option>
            <option value="dark">{t("settings.theme.dark")}</option>
          </select>
        </label>

        <label className="field">
          <span className="label-text">{t("settings.language.label")}</span>
          <select
            value={settings.language}
            onChange={(event) =>
              setSettings({
                ...settings,
                language: event.target.value as typeof settings.language
              })
            }
          >
            <option value="ko">{t("settings.language.ko")}</option>
            <option value="en">{t("settings.language.en")}</option>
          </select>
        </label>

        <label className="field">
          <span className="label-text">{t("settings.character_type.label")}</span>
          <select
            value={settings.characterType || "3d"}
            onChange={(event) =>
              setSettings({
                ...settings,
                characterType: event.target.value as typeof settings.characterType
              })
            }
          >
            <option value="3d">{t("settings.character_type.3d")}</option>
            <option value="video">{t("settings.character_type.video")}</option>
          </select>
        </label>

        <label className="field">
          <div className="flex justify-between items-center">
            <span className="label-text">{t("settings.widget_opacity")}</span>
            <span className="text-sm font-medium">{settings.widgetOpacity}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="1"
            value={settings.widgetOpacity}
            onChange={(event) =>
              setSettings({ ...settings, widgetOpacity: parseInt(event.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#B8956A]"
          />
        </label>
      </div>

      <div className="card-header mt-6">
        <h2>{t("settings.agent_persona.title")}</h2>
      </div>

      <div className="settings-fields persona-settings">
        {settings.agents.length > 0 ? (
          settings.agents.map((agent, index) => (
            <div key={agent.id} className="agent-persona-card">
              <div className="field">
                <span className="label-text">{t("settings.agent_persona.name")}</span>
                <input
                  type="text"
                  value={agent.name}
                  onChange={(e) => {
                    const nextAgents = [...settings.agents];
                    nextAgents[index] = { ...agent, name: e.target.value };
                    setSettings({ ...settings, agents: nextAgents });
                  }}
                />
              </div>

              <div className="field">
                <span className="label-text">{t("settings.agent_persona.description")}</span>
                <textarea
                  value={agent.persona?.description || ""}
                  onChange={(e) => {
                    const nextAgents = [...settings.agents];
                    nextAgents[index] = {
                      ...agent,
                      persona: { ...(agent.persona || { tone: "professional", instructions: [] }), description: e.target.value }
                    };
                    setSettings({ ...settings, agents: nextAgents });
                  }}
                  rows={2}
                />
              </div>

              <div className="field">
                <span className="label-text">{t("settings.agent_persona.tone.label")}</span>
                <select
                  value={agent.persona?.tone || "professional"}
                  onChange={(e) => {
                    const nextAgents = [...settings.agents];
                    nextAgents[index] = {
                      ...agent,
                      persona: { ...(agent.persona || { description: "", instructions: [] }), tone: e.target.value as any }
                    };
                    setSettings({ ...settings, agents: nextAgents });
                  }}
                >
                  <option value="friendly">{t("settings.agent_persona.tone.friendly")}</option>
                  <option value="professional">{t("settings.agent_persona.tone.professional")}</option>
                  <option value="strict">{t("settings.agent_persona.tone.strict")}</option>
                  <option value="casual">{t("settings.agent_persona.tone.casual")}</option>
                </select>
              </div>

              <div className="field">
                <span className="label-text">{t("settings.agent_persona.instructions.label")}</span>
                <textarea
                  placeholder={t("settings.agent_persona.instructions.placeholder")}
                  value={agent.persona?.instructions?.join("\n") || ""}
                  onChange={(e) => {
                    const nextAgents = [...settings.agents];
                    nextAgents[index] = {
                      ...agent,
                      persona: { ...(agent.persona || { description: "", tone: "professional" }), instructions: e.target.value.split("\n") }
                    };
                    setSettings({ ...settings, agents: nextAgents });
                  }}
                  rows={4}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="empty-agents-message">
            <p>{t("settings.no_agents")}</p>
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="primary-btn flex items-center gap-2" onClick={save} disabled={status === "saving"}>
          <Save size={18} />
          <span>{status === "saving" ? t("settings.saving") : t("settings.save")}</span>
        </button>
        {status === "saved" && <span className="status-message success">{t("settings.saved")}</span>}
      </div>
    </div>
  );
};
