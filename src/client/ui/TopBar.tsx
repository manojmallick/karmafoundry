import React from "react";
import { DEMO_LABEL } from "../../shared/constants";

interface TopBarProps {
  twist?: string;
  multiplier?: number;
  multiplierExpiry?: number;
  canDemo?: boolean;
}

export function TopBar({ twist, multiplier, multiplierExpiry, canDemo }: TopBarProps) {
  const hasMultiplier = multiplier && multiplier > 1 && multiplierExpiry && multiplierExpiry > Date.now();

  return (
    <div style={{ ...styles.container, pointerEvents: "auto" as const }}>
      <div style={styles.left}>
        <span style={styles.logoIcon}>🏭</span>
        <span style={styles.title}>KarmaFoundry</span>
        {canDemo && <span style={styles.demoPill}>{DEMO_LABEL}</span>}
      </div>
      
      {hasMultiplier && (
        <div style={styles.multiplier}>
          ⚡ {multiplier}x ACTIVE
        </div>
      )}
      
      {twist && (
        <div style={styles.twist}>
          Today's Twist: {twist}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    background: "rgba(7, 10, 20, 0.85)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid var(--kf-border)",
  } as React.CSSProperties,
  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,
  logoIcon: {
    fontSize: "26px",
    lineHeight: 1,
  } as React.CSSProperties,
  title: {
    fontSize: "20px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-head)",
    letterSpacing: "-0.02em",
    color: "var(--kf-text)",
  } as React.CSSProperties,
  multiplier: {
    padding: "5px 14px",
    background: "var(--kf-grad-purple)",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 800,
    color: "#fff",
    animation: "pulse 2s infinite",
    boxShadow: "0 4px 16px rgba(124, 92, 255, 0.25)",
  } as React.CSSProperties,
  twist: {
    fontSize: "13px",
    color: "var(--kf-text-mute)",
  } as React.CSSProperties,
  demoPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    background: "rgba(124, 92, 255, 0.18)",
    border: "1px solid rgba(124, 92, 255, 0.35)",
    borderRadius: "999px",
    color: "var(--kf-purple-2)",
    textTransform: "uppercase",
  } as React.CSSProperties,
};
