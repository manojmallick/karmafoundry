import { useEffect, useRef, useState, useCallback } from "react";
import { fetchStateSync } from "./api";
import { gmBridge } from "./bridge";

export function useStateSync(interval: number, enabled: boolean = true) {
  const [state, setState] = useState<any>(null);
  const timeoutRef = useRef<number>();

  const sync = useCallback(async () => {
    try {
      const data = await fetchStateSync();
      setState(data);

      // Send to GameMaker (only if enabled)
      if (enabled) {
        gmBridge.send({
          type: "STATE_SYNC",
          payload: data,
        });
      }
    } catch (err) {
      console.error("State sync error:", err);
    }
  }, [enabled]);

  const refetch = useCallback(async () => {
    await sync();
  }, [sync]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const loop = async () => {
      await sync();
      timeoutRef.current = window.setTimeout(loop, interval);
    };

    loop(); // Initial sync

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [interval, sync, enabled]);

  return { state, refetch };
}
