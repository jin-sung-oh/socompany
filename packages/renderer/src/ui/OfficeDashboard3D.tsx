import { useMemo, useState } from "react";
import { useAgentStore } from "../stores/useAgentStore";
import { getSpeciesMeta } from "../data/agentCatalog";

export function OfficeDashboard3D() {
  const agents = useAgentStore((state) => state.agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? null, [agents, selectedAgentId]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(circle at top, #28475f 0%, #132433 55%, #0b1118 100%)",
        color: "white",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.04), transparent 35%)" }} />
      <div style={{ position: "relative", zIndex: 2, padding: "32px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>3D 실험실</h2>
        <p style={{ marginTop: "8px", opacity: 0.72 }}>실제 3D 캐릭터 자산 대신, 현재는 6종 동물과 7개 에이전트 메타데이터를 입체 카드로 검증하고 있습니다.</p>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "20px",
          padding: "0 32px 32px",
        }}
      >
        {agents.map((agent, index) => {
          const species = getSpeciesMeta(agent.species);
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              style={{
                border: selectedAgentId === agent.id ? "2px solid #ffd166" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: "24px",
                padding: "22px",
                minHeight: "220px",
                background: `linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))`,
                boxShadow: `0 ${18 + index * 2}px ${40 + index * 2}px rgba(0,0,0,0.18)`,
                transform: `perspective(1000px) rotateX(14deg) rotateY(${index % 2 === 0 ? -8 : 8}deg)`,
                color: "white",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "54px", marginBottom: "12px" }}>{species.emoji}</div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>{agent.name}</div>
              <div style={{ opacity: 0.75, marginTop: "6px" }}>{species.label} · {agent.role}</div>
              <div style={{ marginTop: "16px", fontSize: "13px", opacity: 0.8 }}>{species.traitSummary}</div>
              <div style={{ marginTop: "18px", display: "inline-flex", padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.1)", fontSize: "12px" }}>
                상태: {agent.status}
              </div>
            </button>
          );
        })}
      </div>

      {selectedAgent && (
        <div style={{ position: "absolute", right: 24, bottom: 24, width: "320px", padding: "20px", borderRadius: "24px", background: "rgba(8, 16, 24, 0.88)", border: "1px solid rgba(255,255,255,0.12)", zIndex: 3 }}>
          <div style={{ fontSize: "42px" }}>{getSpeciesMeta(selectedAgent.species).emoji}</div>
          <h3 style={{ marginBottom: "8px" }}>{selectedAgent.name}</h3>
          <p style={{ marginTop: 0, opacity: 0.75 }}>{getSpeciesMeta(selectedAgent.species).label} · {selectedAgent.role}</p>
          <p style={{ fontSize: "14px", lineHeight: 1.6 }}>{selectedAgent.persona?.description ?? "설정된 페르소나 설명이 없습니다."}</p>
          <p style={{ fontSize: "13px", opacity: 0.72 }}>현재 3D 보기에서는 종/역할/상태 메타데이터 검증에 집중하고 있습니다.</p>
        </div>
      )}
    </div>
  );
}
