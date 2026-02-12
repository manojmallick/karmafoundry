import React from "react";

interface LeaderboardPanelProps {
  entries: Array<{ display: string; score: number }>;
  onClose: () => void;
}

export function LeaderboardPanel({ entries, onClose }: LeaderboardPanelProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🏆 Leaderboard</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        
        <div style={styles.content}>
          {entries.length === 0 ? (
            <div style={styles.empty}>No contributors yet. Be the first!</div>
          ) : (
            entries.slice(0, 10).map((entry, index) => (
              <div key={`${entry.display}-${index}`} style={styles.entry}>
                <span style={styles.rank}>#{index + 1}</span>
                <span style={styles.user}>{entry.display}</span>
                <span style={styles.score}>{entry.score} pts</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(7, 10, 20, 0.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(6px)",
    animation: "fadeIn 0.2s",
  } as React.CSSProperties,
  panel: {
    background: "rgba(11, 16, 36, 0.95)",
    border: "1px solid var(--kf-border)",
    borderRadius: "var(--kf-r-3)",
    width: "90%",
    maxWidth: "460px",
    maxHeight: "80vh",
    overflow: "auto",
    boxShadow: "var(--kf-shadow-2)",
    backdropFilter: "blur(14px)",
    animation: "scaleIn 0.25s",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--kf-border)",
  } as React.CSSProperties,
  title: {
    margin: 0,
    fontSize: "20px",
    fontFamily: "var(--kf-font-head)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--kf-text)",
  } as React.CSSProperties,
  closeButton: {
    background: "none",
    border: "none",
    color: "var(--kf-text-mute)",
    fontSize: "20px",
    cursor: "pointer",
    padding: "0",
    width: "30px",
    height: "30px",
    borderRadius: "999px",
  } as React.CSSProperties,
  content: {
    padding: "20px 24px",
  } as React.CSSProperties,
  empty: {
    textAlign: "center",
    color: "var(--kf-text-mute)",
    padding: "40px 20px",
    fontSize: "15px",
  } as React.CSSProperties,
  entry: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    background: "var(--kf-surface)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "var(--kf-r-1)",
    marginBottom: "8px",
  } as React.CSSProperties,
  rank: {
    fontSize: "17px",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
    color: "var(--kf-purple)",
    minWidth: "40px",
  } as React.CSSProperties,
  user: {
    flex: 1,
    color: "var(--kf-text)",
    fontWeight: 500,
  } as React.CSSProperties,
  score: {
    fontSize: "15px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: "var(--kf-text-dim)",
  } as React.CSSProperties,
};
