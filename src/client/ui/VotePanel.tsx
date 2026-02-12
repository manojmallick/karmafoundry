import React from "react";
import { postVote } from "../api";

interface VotePanelProps {
  options: Array<{ id: string; label: string; effect: any }>;
  onClose: () => void;
  onVoted: () => void;
}

export function VotePanel({ options, onClose, onVoted }: VotePanelProps) {
  const [voting, setVoting] = React.useState(false);

  const handleVote = async (optionId: string) => {
    setVoting(true);
    try {
      await postVote(optionId);
      onVoted();
      onClose();
    } catch (err) {
      console.error("Vote failed:", err);
      alert("Failed to vote. Please try again.");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Vote for Today's Twist</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        
        <div style={styles.content}>
          {options.map((opt) => (
            <button
              key={opt.id}
              style={styles.optionButton}
              onClick={() => handleVote(opt.id)}
              disabled={voting}
            >
              <div style={styles.optionLabel}>{opt.label}</div>
              <div style={styles.optionEffect}>
                {opt.effect.energyMultiplier}x for{" "}
                {Math.round(opt.effect.durationMs / 60000)} min
              </div>
            </button>
          ))}
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
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  } as React.CSSProperties,
  optionButton: {
    padding: "18px 20px",
    background: "var(--kf-grad-purple)",
    border: "none",
    borderRadius: "var(--kf-r-2)",
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform .08s ease, filter .15s ease",
    boxShadow: "0 6px 18px rgba(124, 92, 255, 0.18)",
  } as React.CSSProperties,
  optionLabel: {
    fontSize: "17px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-head)",
    marginBottom: "4px",
  } as React.CSSProperties,
  optionEffect: {
    fontSize: "14px",
    opacity: 0.85,
    color: "rgba(255,255,255,0.8)",
  } as React.CSSProperties,
};
