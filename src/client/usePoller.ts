import { useEffect, useRef } from "react";
import { postPoll } from "./api";

export function usePoller(
  interval: number,
  onBoost?: (boost: any) => void,
  enabled: boolean = true,
  onPenalty?: (penalty: any) => void
) {
  const timeoutRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const poll = async () => {
      try {
        const data = await postPoll();
        if (data?.boost) {
          onBoost?.(data.boost);
        }
        if (data?.penalty) {
          onPenalty?.(data.penalty);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }

      timeoutRef.current = window.setTimeout(poll, interval);
    };

    timeoutRef.current = window.setTimeout(poll, interval);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [interval, onBoost, enabled, onPenalty]);
}
