import React from "react";

export interface VictoryEntry {
  display: string;
  score: number;
}

interface VictoryOverlayProps {
  entries: VictoryEntry[];
  canClaim: boolean;
  claimLoading: boolean;
  onClaim: () => void;
}

export function VictoryOverlay({
  entries,
  canClaim,
  claimLoading,
  onClaim,
}: VictoryOverlayProps) {
  const list = entries.length > 0 ? entries.slice(0, 3) : [];

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.title}>🏆 Community Victory!</div>
        <div style={styles.subtitle}>Boss defeated — Forge unlocked</div>

        <div style={styles.top3}>
          {list.length === 0 && (
            <div style={styles.empty}>No contributors yet</div>
          )}
          {list.map((entry, index) => (
            <div key={`${entry.display}-${index}`} style={styles.row}>
              <div style={styles.rank}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </div>
              <div style={styles.name}>{entry.display}</div>
              <div style={styles.score}>{entry.score} pts</div>
            </div>
          ))}
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressBar} />
        </div>

        <div style={styles.ctaRow}>
          <button
            style={{
              ...styles.ctaButton,
              ...(canClaim ? styles.ctaButtonActive : styles.ctaButtonDisabled),
            }}
            onClick={onClaim}
            disabled={!canClaim || claimLoading}
          >
            {canClaim
              ? claimLoading
                ? "Claiming..."
                : "Claim Reward"
              : "Already claimed"}
          </button>
        </div>

        <div style={styles.share}>Comment to power tomorrow's forge!</div>

        <div style={styles.confetti}>
          <span style={{ ...styles.confettiDot, animationDelay: "0ms" }}>✨</span>
          <span style={{ ...styles.confettiDot, animationDelay: "120ms" }}>💥</span>
          <span style={{ ...styles.confettiDot, animationDelay: "240ms" }}>🎉</span>
          <span style={{ ...styles.confettiDot, animationDelay: "360ms" }}>✨</span>
          <span style={{ ...styles.confettiDot, animationDelay: "480ms" }}>🎊</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at top, rgba(247, 201, 72, 0.12), rgba(7, 10, 20, 0.94))",
    animation: "fadeIn 0.2s",
    pointerEvents: "auto",
    backdropFilter: "blur(6px)",
  } as React.CSSProperties,
  panel: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(11, 16, 36, 0.98) 0%, rgba(7, 10, 20, 0.98) 100%)",
    borderRadius: "var(--kf-r-3)",
    border: "1px solid rgba(247, 201, 72, 0.25)",
    padding: "32px 36px",
    width: "min(90vw, 520px)",
    textAlign: "center",
    color: "#fef3d7",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(247, 201, 72, 0.08)",
    animation: "scaleIn 0.35s",
    backdropFilter: "blur(14px)",
  } as React.CSSProperties,
  title: {
    fontSize: "32px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-head)",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  subtitle: {
    marginTop: "8px",
    fontSize: "15px",
    color: "rgba(255, 230, 190, 0.8)",
    fontWeight: 500,
  } as React.CSSProperties,
  top3: {
    marginTop: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  } as React.CSSProperties,
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "11px 16px",
    borderRadius: "var(--kf-r-1)",
    background: "var(--kf-surface)",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(6px)",
  } as React.CSSProperties,
  rank: {
    fontSize: "22px",
  } as React.CSSProperties,
  name: {
    flex: 1,
    textAlign: "left",
    marginLeft: "10px",
    fontWeight: 700,
    fontSize: "15px",
  } as React.CSSProperties,
  score: {
    fontWeight: 800,
    color: "var(--kf-gold)",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  empty: {
    padding: "16px",
    color: "rgba(255, 230, 190, 0.6)",
    fontStyle: "italic",
  } as React.CSSProperties,
  progressWrap: {
    marginTop: "18px",
    height: "6px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "999px",
    overflow: "hidden",
  } as React.CSSProperties,
  progressBar: {
    height: "100%",
    width: "100%",
    background: "var(--kf-grad-gold)",
    animation: "victoryProgress 5s linear forwards",
  } as React.CSSProperties,
  ctaRow: {
    marginTop: "22px",
    display: "flex",
    justifyContent: "center",
  } as React.CSSProperties,
  ctaButton: {
    padding: "14px 28px",
    borderRadius: "var(--kf-r-2)",
    fontSize: "16px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-body)",
    border: "none",
    cursor: "pointer",
    transition: "transform .08s ease, filter .15s ease",
  } as React.CSSProperties,
  ctaButtonActive: {
    background: "var(--kf-grad-gold)",
    color: "rgba(10, 12, 20, 0.92)",
    boxShadow: "0 8px 24px rgba(247, 201, 72, 0.22)",
  } as React.CSSProperties,
  ctaButtonDisabled: {
    background: "var(--kf-surface-2)",
    color: "var(--kf-text-mute)",
  } as React.CSSProperties,
  share: {
    marginTop: "14px",
    fontSize: "13px",
    color: "rgba(255, 230, 190, 0.6)",
  } as React.CSSProperties,
  confetti: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "center",
    gap: "8px",
  } as React.CSSProperties,
  confettiDot: {
    fontSize: "18px",
    animation: "floatConfetti 1.4s ease-in-out infinite",
  } as React.CSSProperties,
};