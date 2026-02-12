import React, { useRef, useEffect } from "react";
import { gmBridge } from "./bridge";

interface CanvasStageProps {
  gameUrl: string;
}

export function CanvasStage({ gameUrl }: CanvasStageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyFallback = useRef<number | null>(null);

  useEffect(() => {
    if (iframeRef.current) {
      gmBridge.setIframe(iframeRef.current);
    }
    return () => {
      if (readyFallback.current) {
        clearTimeout(readyFallback.current);
      }
    };
  }, []);

  const handleLoad = () => {
    if (readyFallback.current) {
      clearTimeout(readyFallback.current);
    }
    readyFallback.current = window.setTimeout(() => {
      gmBridge.markReady();
    }, 1200);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <iframe
        ref={iframeRef}
        src={gameUrl}
        onLoad={handleLoad}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        title="KarmaFoundry Game"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
