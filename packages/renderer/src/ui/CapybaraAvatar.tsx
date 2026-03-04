import { CSSProperties } from "react";

interface CapybaraAvatarProps {
  state?: "idle" | "thinking" | "working" | "completed";
  size?: number;
}

export const CapybaraAvatar = ({ state = "idle", size = 80 }: CapybaraAvatarProps) => {
  const getEyeState = () => {
    switch (state) {
      case "thinking":
        return "0.3";
      case "working":
        return "0.5";
      case "completed":
        return "1";
      default:
        return "0.8";
    }
  };

  const containerStyle: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
  };

  return (
    <div style={containerStyle} className={`capybara-avatar ${state}`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%" }}
      >
        {/* 몸통 */}
        <ellipse cx="50" cy="65" rx="35" ry="25" fill="#A67C52" />

        {/* 머리 */}
        <ellipse cx="50" cy="35" rx="28" ry="25" fill="#B8956A" />

        {/* 귀 (왼쪽) */}
        <ellipse cx="35" cy="22" rx="6" ry="8" fill="#A67C52" />

        {/* 귀 (오른쪽) */}
        <ellipse cx="65" cy="22" rx="6" ry="8" fill="#A67C52" />

        {/* 눈 (왼쪽) */}
        <circle cx="42" cy="32" r="3" fill="#2b1f1a" opacity={getEyeState()} />

        {/* 눈 (오른쪽) */}
        <circle cx="58" cy="32" r="3" fill="#2b1f1a" opacity={getEyeState()} />

        {/* 코 */}
        <ellipse cx="50" cy="42" rx="4" ry="3" fill="#8B6F47" />

        {/* 입 */}
        <path
          d={state === "completed" ? "M 45 46 Q 50 50 55 46" : "M 45 46 Q 50 48 55 46"}
          stroke="#2b1f1a"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* 발 (왼쪽 앞) */}
        <ellipse cx="35" cy="82" rx="6" ry="8" fill="#A67C52" />

        {/* 발 (오른쪽 앞) */}
        <ellipse cx="50" cy="82" rx="6" ry="8" fill="#A67C52" />

        {/* 발 (왼쪽 뒤) */}
        <ellipse cx="50" cy="82" rx="6" ry="8" fill="#A67C52" opacity="0.6" />

        {/* 발 (오른쪽 뒤) */}
        <ellipse cx="65" cy="82" rx="6" ry="8" fill="#A67C52" />

        {/* thinking 상태일 때 물음표 */}
        {state === "thinking" && (
          <text x="75" y="25" fontSize="12" fill="#9ad1f5">
            ?
          </text>
        )}

        {/* working 상태일 때 땀방울 */}
        {state === "working" && (
          <text x="75" y="25" fontSize="12" fill="#f7b267">
            💧
          </text>
        )}

        {/* completed 상태일 때 별 */}
        {state === "completed" && (
          <text x="75" y="25" fontSize="12">
            ✨
          </text>
        )}
      </svg>
    </div>
  );
};
