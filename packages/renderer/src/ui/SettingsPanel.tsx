import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useTranslation } from "../hooks/useTranslation";
import { getSpeciesMeta, normalizeSettings } from "../data/agentCatalog";
import type { Persona } from "@kafi/shared";
import { Save, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { LoadingSkeleton } from "./components/LoadingSkeleton";

export const SettingsPanel = () => {
  const { settings, status, setSettings, save } = useSettingsStore();
  const { t } = useTranslation();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    void checkConnection();
  }, []);

  const checkConnection = async () => {
    if (!window.kafi?.ollamaCheck) {
      return;
    }
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
    if (!window.kafi?.getOllamaModels) {
      return;
    }
    setIsLoadingModels(true);
    try {
      const result = await window.kafi.getOllamaModels();
      if (result.success && result.models) {
        setAvailableModels(result.models.map((model) => model.name));
      }
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const updatePersonaAgent = (index: number, next: Partial<(typeof settings.agents)[number]>) => {
    const nextAgents = [...settings.agents];
    nextAgents[index] = {
      ...nextAgents[index],
      ...next,
      persona: next.persona ?? nextAgents[index].persona,
    };
    setSettings(normalizeSettings({ ...settings, agents: nextAgents }));
  };

  const updatePersona = (index: number, nextPersona: Partial<Persona>) => {
    const agent = settings.agents[index];
    updatePersonaAgent(index, {
      persona: {
        description: agent.persona?.description ?? "",
        tone: agent.persona?.tone ?? "professional",
        instructions: agent.persona?.instructions ?? [],
        ...nextPersona,
      },
    });
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
        <button className="text-btn" onClick={() => void checkConnection()}>재시도</button>
      </div>

      {!isConnected && isConnected !== null && (
        <div className="error-box">
          <AlertCircle size={16} />
          <p>Ollama가 실행 중인지 확인해 주세요. (http://localhost:11434)</p>
        </div>
      )}

      <div className="settings-fields">
        <label className="field">
          <span className="label-text">Ollama 모델</span>
          <div className="select-with-action">
            <select value={settings.ollamaModel} onChange={(event) => setSettings({ ...settings, ollamaModel: event.target.value })} disabled={isLoadingModels || !isConnected}>
              {availableModels.length === 0 ? (
                <option value="">모델을 찾을 수 없음</option>
              ) : (
                availableModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))
              )}
            </select>
            <button className="icon-btn" onClick={() => void fetchModels()} title="새로고침" disabled={isLoadingModels || !isConnected}>
              <RefreshCw size={16} className={isLoadingModels ? "animate-spin" : ""} />
            </button>
          </div>
          {isLoadingModels && <LoadingSkeleton compact lines={2} className="settings-loading-skeleton" />}
        </label>

        <label className="field">
          <span className="label-text">API Key</span>
          <input type="password" placeholder="sk-..." value={settings.apiKey} onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })} />
        </label>

        <label className="field">
          <span className="label-text">테마</span>
          <select value={settings.theme} onChange={(event) => setSettings({ ...settings, theme: event.target.value as typeof settings.theme })}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="field">
          <span className="label-text">언어</span>
          <select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value as typeof settings.language })}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="field">
          <span className="label-text">오피스 보기</span>
          <select value={settings.characterType} onChange={(event) => setSettings({ ...settings, characterType: event.target.value as typeof settings.characterType })}>
            <option value="3d">3D 커맨드 덱</option>
            <option value="video">2D 기본 오피스</option>
          </select>
        </label>

        <label className="field">
          <div className="flex justify-between items-center">
            <span className="label-text">위젯 투명도</span>
            <span className="text-sm font-medium text-kafi-accent-600">{settings.widgetOpacity}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="1"
            value={settings.widgetOpacity}
            onChange={(event) => setSettings({ ...settings, widgetOpacity: parseInt(event.target.value, 10) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#B8956A]"
          />
        </label>
      </div>

      <div className="card-header mt-6">
        <h2>Ollama 파라미터</h2>
      </div>

      <div className="settings-fields" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <label className="field">
          <span className="label-text">Temperature</span>
          <input type="number" min="0" max="2" step="0.1" value={settings.ollamaParameters.temperature} onChange={(event) => setSettings({ ...settings, ollamaParameters: { ...settings.ollamaParameters, temperature: parseFloat(event.target.value) || 0 } })} />
        </label>
        <label className="field">
          <span className="label-text">Context</span>
          <input type="number" min="512" step="512" value={settings.ollamaParameters.num_ctx} onChange={(event) => setSettings({ ...settings, ollamaParameters: { ...settings.ollamaParameters, num_ctx: parseInt(event.target.value, 10) || 4096 } })} />
        </label>
        <label className="field">
          <span className="label-text">Top K</span>
          <input type="number" min="1" value={settings.ollamaParameters.top_k} onChange={(event) => setSettings({ ...settings, ollamaParameters: { ...settings.ollamaParameters, top_k: parseInt(event.target.value, 10) || 40 } })} />
        </label>
        <label className="field">
          <span className="label-text">Top P</span>
          <input type="number" min="0" max="1" step="0.05" value={settings.ollamaParameters.top_p} onChange={(event) => setSettings({ ...settings, ollamaParameters: { ...settings.ollamaParameters, top_p: parseFloat(event.target.value) || 0.9 } })} />
        </label>
      </div>

      <div className="card-header mt-6">
        <h2>{t("settings.agent_persona.title")}</h2>
      </div>

      <div className="settings-fields persona-settings">
        {settings.agents.map((agent, index) => {
          const species = getSpeciesMeta(agent.species);
          return (
            <div key={agent.id} className="agent-persona-card">
              <div className="field">
                <span className="label-text">종</span>
                <input type="text" value={`${species.emoji} ${species.label}`} disabled />
              </div>

              <div className="field">
                <span className="label-text">이름</span>
                <input type="text" value={agent.name} onChange={(event) => updatePersonaAgent(index, { name: event.target.value })} />
              </div>

              <div className="field">
                <span className="label-text">역할</span>
                <input type="text" value={agent.role} onChange={(event) => updatePersonaAgent(index, { role: event.target.value })} />
              </div>

              <div className="field">
                <span className="label-text">설명</span>
                <textarea value={agent.persona?.description ?? ""} onChange={(event) => updatePersona(index, { description: event.target.value })} rows={2} />
              </div>

              <div className="field">
                <span className="label-text">말투</span>
                <select value={agent.persona?.tone ?? "professional"} onChange={(event) => updatePersona(index, { tone: event.target.value as Persona["tone"] })}>
                  <option value="friendly">친절함</option>
                  <option value="professional">전문적</option>
                  <option value="strict">엄격함</option>
                  <option value="casual">캐주얼</option>
                </select>
              </div>

              <div className="field">
                <span className="label-text">지시사항</span>
                <textarea
                  placeholder="한 줄에 하나씩 입력하세요"
                  value={agent.persona?.instructions?.join("\n") ?? ""}
                  onChange={(event) => updatePersona(index, { instructions: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                  rows={4}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="settings-footer">
        <button className="primary-btn flex items-center gap-2" onClick={() => void save()} disabled={status === "saving"}>
          <Save size={18} />
          <span>{status === "saving" ? t("settings.saving") : t("settings.save")}</span>
        </button>
        {status === "saved" && <span className="status-message success">{t("settings.saved")}</span>}
      </div>
    </div>
  );
};
