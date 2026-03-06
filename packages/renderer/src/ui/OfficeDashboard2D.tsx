import { useEffect, useRef, useState } from "react";
import { useAgentStore, AgentState } from "../stores/useAgentStore";
import { getAgentAsset, getSpeciesMeta } from "../data/agentCatalog";
import { Lightbulb, Sparkles, Zap } from "lucide-react";

const PixelCharacter = ({ agent }: { agent: AgentState }) => {
  const isWalking = agent.targetPosition !== null;
  const isThinking = agent.status === "thinking";
  const isCompleted = agent.status === "completed";

  return (
    <div className={`pixel-agent-body ${isWalking ? "animate-pixel-walk" : "animate-pixel-breathe"}`}>
      <div className="pixel-shadow"></div>
      <div style={{ fontSize: "48px", position: "relative" }}>
        {getAgentAsset(agent)}
        {agent.status === "working" && (
          <>
            <div className="pixel-vfx" style={{ right: "-15px" }}>⚡</div>
            <div className="pixel-typing-vfx">⌨️</div>
          </>
        )}
        {isThinking && (
          <div className="pixel-vfx" style={{ left: "50%", transform: "translateX(-50%)" }}>
            <Lightbulb size={24} color="#ffd54f" className="animate-pulse" />
          </div>
        )}
        {isCompleted && (
          <div className="pixel-vfx" style={{ left: "50%", transform: "translateX(-50%)" }}>
            <Sparkles size={24} color="#4caf50" />
          </div>
        )}
      </div>

      {isThinking && (
        <div className="pixel-speech-bubble" style={{ fontSize: "10px", width: "88px", top: "-72px", left: "28px", padding: "4px", borderWidth: "2px" }}>
          아이디어 정리 중...
        </div>
      )}
    </div>
  );
};

const PixelFurniture = ({ type, x, y }: { type: "desk" | "coffee" | "plant", x: number, y: number }) => (
  <div className="pixel-furniture" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: Math.floor(y) }}>
    {type === "desk" && (
      <div className="pixel-desk">
        <div className="pixel-monitor">
          <div style={{ width: "100%", height: "100%", background: "#00bcd4", opacity: 0.2, animation: "pulse 2s infinite" }}></div>
        </div>
      </div>
    )}
    {type === "coffee" && <div style={{ fontSize: "32px", animation: "float 3s infinite" }}>☕</div>}
    {type === "plant" && <div style={{ fontSize: "40px" }}>🌵</div>}
  </div>
);

export function OfficeDashboard2D() {
  const agents = useAgentStore((state) => state.agents);
  const moveAgents = useAgentStore((state) => state.moveAgents);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["[시스템] 2D 픽셀 오피스 준비 완료", "[시스템] 동물 사원 시뮬레이션을 시작합니다."]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused) {
      return;
    }
    const interval = setInterval(() => {
      moveAgents();
    }, 50);
    return () => clearInterval(interval);
  }, [isPaused, moveAgents]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  return (
    <div
      className="pixel-office-container"
      style={{ width: "100%", height: "100%", background: "#2c3e50", perspective: "1000px" }}
      onClick={() => setSelectedAgentId(null)}
    >
      <div style={{ position: "absolute", top: 40, left: 40, zIndex: 300, color: "white", pointerEvents: "none" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 900, textShadow: "6px 6px 0 rgba(0,0,0,0.5)", fontFamily: "monospace" }}>
          ANIMAL OFFICE
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
          <Zap size={16} color="#ffd54f" />
          <span style={{ fontSize: "14px", fontWeight: "bold", textShadow: "2px 2px 0 black" }}>6종 동물, 7개 에이전트 협업 시뮬레이션</span>
        </div>
      </div>

      <div className="pixel-office-map" style={{ transform: "rotateX(10deg) rotateZ(-2deg)", transition: "transform 0.5s ease" }}>
        <PixelFurniture type="desk" x={25} y={25} />
        <PixelFurniture type="desk" x={75} y={25} />
        <PixelFurniture type="desk" x={25} y={75} />
        <PixelFurniture type="desk" x={75} y={75} />
        <PixelFurniture type="coffee" x={50} y={15} />
        <PixelFurniture type="plant" x={10} y={10} />
        <PixelFurniture type="plant" x={90} y={90} />

        {agents.map((agent) => {
          const species = getSpeciesMeta(agent.species);
          return (
            <div
              key={agent.id}
              className="pixel-agent"
              style={{
                left: `${agent.position.x}%`,
                top: `${agent.position.y}%`,
                transform: `translate(-50%, -50%) scaleX(${agent.direction === "left" ? -1 : 1})`,
                zIndex: Math.floor(agent.position.y) + 100,
              }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAgentId(agent.id);
                addLog(`${species.label} ${agent.name}에게 포커스를 맞췄습니다.`);
              }}
            >
              <PixelCharacter agent={agent} />
              <div
                className="pixel-agent-name"
                style={{
                  transform: `translateX(-50%) scaleX(${agent.direction === "left" ? -1 : 1})`,
                  bottom: "-35px",
                  background: selectedAgentId === agent.id ? "#ffd54f" : "rgba(0,0,0,0.7)",
                  color: selectedAgentId === agent.id ? "black" : "white",
                }}
              >
                {agent.name}
              </div>
            </div>
          );
        })}

        {selectedAgent && (
          <div
            className="pixel-speech-bubble"
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotateZ(2deg)", width: "340px", zIndex: 500, borderWidth: "6px", boxShadow: "10px 10px 0 rgba(0,0,0,0.2)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", gap: "15px", alignItems: "center", marginBottom: "15px", borderBottom: "4px solid black", paddingBottom: "10px" }}>
              <span style={{ fontSize: "40px" }}>{getAgentAsset(selectedAgent)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "18px" }}>{selectedAgent.name}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>{getSpeciesMeta(selectedAgent.species).label} · {selectedAgent.role}</div>
              </div>
            </div>
            <div style={{ fontSize: "12px", background: "#f5f5f5", padding: "10px", borderRadius: "4px", marginBottom: "15px" }}>
              <strong>상태:</strong> {selectedAgent.status}<br />
              <strong>행동:</strong> {selectedAgent.behavior}<br />
              <strong>페르소나:</strong> {selectedAgent.persona?.description ?? "설명 없음"}
            </div>
            <button className="pixel-btn" style={{ width: "100%", padding: "10px" }} onClick={() => addLog(`${selectedAgent.name}에게 새 작업을 배정할 준비가 되었습니다.`)}>
              이 사원에게 작업 배정하기
            </button>
          </div>
        )}
      </div>

      <div className="pixel-ui-bottom" style={{ height: "140px", borderTopWidth: "8px", background: "#1a252f" }}>
        <div className="pixel-log-box" ref={logRef} style={{ border: "none", background: "transparent", padding: "15px", color: "#ecf0f1" }}>
          {logs.map((log, index) => (
            <div key={`${log}-${index}`} style={{ marginBottom: "4px", opacity: 1 - index / 40 }}>{log}</div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "220px", padding: "15px" }}>
          <button className="pixel-btn" style={{ flex: 1, background: isPaused ? "#27ae60" : "#c0392b" }} onClick={() => setIsPaused((prev) => !prev)}>
            {isPaused ? "시뮬레이션 재개" : "시뮬레이션 정지"}
          </button>
          <button className="pixel-btn" style={{ flex: 1 }} onClick={() => addLog("동물 사원 팀 동기화를 수행했습니다.")}>
            팀 상태 동기화
          </button>
        </div>
      </div>
    </div>
  );
}
