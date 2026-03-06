import { useRef, useState, useEffect } from "react";

// 공통 타입 정의
export type AnimalState = "idle" | "thinking" | "working" | "completed" | "error";

export interface AnimalModelProps {
  state: AnimalState;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

// 눈 깜빡임 훅
export const useBlinkAnimation = () => {
  const [blink, setBlink] = useState(false);
  const blinkTimer = useRef(0);
  const blinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current !== null) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  return { blink, blinkTimer, blinkTimeoutRef, setBlink };
};

// 눈 깜빡임 업데이트 로직
export const updateBlinkAnimation = (
  delta: number,
  blinkTimer: React.MutableRefObject<number>,
  setBlink: (v: boolean) => void,
  blinkTimeoutRef: React.MutableRefObject<number | null>
) => {
  blinkTimer.current += delta;
  if (blinkTimer.current > 3 + Math.random() * 4) {
    setBlink(true);
    if (blinkTimeoutRef.current !== null) {
      clearTimeout(blinkTimeoutRef.current);
    }
    blinkTimeoutRef.current = window.setTimeout(() => {
      setBlink(false);
      blinkTimeoutRef.current = null;
    }, 150);
    blinkTimer.current = 0;
  }
};
