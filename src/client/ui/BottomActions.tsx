import React from "react";
import { DEMO_LABEL } from "../../shared/constants";

interface BottomActionsProps {
  onVote: () => void;
  onLeaderboard: () => void;
  onTutorial: () => void;
  onDemoBoost: () => void;
  onClaim: () => void;
  hasVoted: boolean;
  isComplete: boolean;
  rewardClaimed: boolean;
  claimLoading: boolean;
  boostLoading: boolean;
  disabled?: boolean;
  canDemo?: boolean;
}

export function BottomActions({
  onVote,
  onLeaderboard,
  onTutorial,
  onDemoBoost,
  onClaim,
  hasVoted,
  isComplete,
  rewardClaimed,
  claimLoading,
  boostLoading,
  disabled = false,
  canDemo = false,
}: BottomActionsProps) {
  return (
    <div style={styles.container}>
      <div style={styles.row}>
        {/* Left: Vote or Claim */}
        {isComplete ? (
          <button
            style={{
              ...styles.button,
              ...(rewardClaimed ? styles.claimedButton : styles.claimButton),
            }}
            onClick={onClaim}
            disabled={disabled || rewardClaimed || claimLoading}
          >
            {rewardClaimed
              ? "✓ Claimed"
              : claimLoading
              ? "Claiming..."
              : "🏆 Claim Reward"}
          </button>
        ) : (
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={onVote}
            disabled={disabled || hasVoted}
          >
            {hasVoted ? "✓ Voted" : "🗳️ Vote"}
          </button>
        )}

        <button style={styles.button} onClick={onLeaderboard} disabled={disabled}>
          🏆 Leaderboard
        </button>

        <button style={styles.button} onClick={onTutorial} disabled={disabled}>
          ❓ Tutorial
        </button>
      </div>

      {canDemo && (
        <div style={styles.row}>
          <div style={styles.demoSection}>
            <span style={styles.demoTag}>{DEMO_LABEL}</span>
            <button
              style={{ ...styles.button, ...styles.demoButton }}
              onClick={onDemoBoost}
              disabled={disabled || boostLoading}
            >
              {boostLoading ? "Boosting..." : "⚡ Demo Boost"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "14px 16px",
    background: "rgba(7, 10, 20, 0.85)",
    backdropFilter: "blur(14px)",
    borderTop: "1px solid var(--kf-border)",
    pointerEvents: "auto",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: "10px",
  } as React.CSSProperties,
  button: {
    flex: 1,
    padding: "14px 16px",
    fontSize: "15px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-body)",
    letterSpacing: "-0.01em",
    border: "1px solid var(--kf-border)",
    borderRadius: "var(--kf-r-2)",
    background: "var(--kf-surface)",
    color: "var(--kf-text)",
    cursor: "pointer",
    transition: "transform .08s ease, filter .15s ease, box-shadow .15s ease",
    userSelect: "none",
  } as React.CSSProperties,
  primaryButton: {
    background: "var(--kf-grad-purple)",
    border: "none",
    boxShadow: "0 8px 20px rgba(124, 92, 255, 0.22)",
  } as React.CSSProperties,
  claimButton: {
    background: "var(--kf-grad-gold)",
    border: "none",
    color: "rgba(10, 12, 20, 0.92)",
    animation: "pulse 1.5s infinite",
    boxShadow: "0 8px 20px rgba(247, 201, 72, 0.22)",
  } as React.CSSProperties,
  claimedButton: {
    background: "rgba(107, 255, 184, 0.15)",
    border: "1px solid rgba(107, 255, 184, 0.35)",
    color: "var(--kf-mint)",
  } as React.CSSProperties,
  demoButton: {
    background: "var(--kf-grad-cta)",
    border: "none",
    color: "rgba(10, 12, 20, 0.92)",
    fontWeight: 800,
    boxShadow: "0 8px 20px rgba(18, 214, 223, 0.18)",
  } as React.CSSProperties,
  demoSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,
  demoTag: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    color: "var(--kf-gold)",
    textTransform: "uppercase",
  } as React.CSSProperties,
};
