import React from "react";
import { postClaim } from "../api";

interface RewardModalProps {
  onClose: () => void;
  onClaimed: () => void;
}

export function RewardModal({ onClose, onClaimed }: RewardModalProps) {
  const [claiming, setClaiming] = React.useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await postClaim();
      onClaimed();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Claim failed:", err);
      alert("Failed to claim. Please try again.");
      setClaiming(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.crate}>🎁</div>
        <h2 style={styles.title}>Goal Achieved!</h2>
        <p style={styles.text}>
          The community has reached today's energy goal!
          <br />
          Claim your reward now.
        </p>
        
        <button
          style={styles.button}
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming ? "Claiming..." : "Claim Reward"}
        </button>
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
    background: "rgba(7, 10, 20, 0.92)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    animation: "fadeIn 0.3s",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,
  modal: {
    background: "var(--kf-grad-purple)",
    borderRadius: "var(--kf-r-3)",
    padding: "40px",
    textAlign: "center",
    maxWidth: "400px",
    animation: "scaleIn 0.5s",
    boxShadow: "0 30px 80px rgba(124, 92, 255, 0.3)",
    border: "1px solid rgba(255,255,255,0.12)",
  } as React.CSSProperties,
  crate: {
    fontSize: "80px",
    marginBottom: "20px",
    animation: "bounce 1s infinite",
  } as React.CSSProperties,
  title: {
    fontSize: "28px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-head)",
    letterSpacing: "-0.02em",
    color: "#fff",
    margin: "0 0 16px 0",
  } as React.CSSProperties,
  text: {
    fontSize: "15px",
    color: "rgba(255, 255, 255, 0.88)",
    marginBottom: "32px",
    lineHeight: "1.6",
  } as React.CSSProperties,
  button: {
    padding: "16px 40px",
    fontSize: "17px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-body)",
    border: "none",
    borderRadius: "var(--kf-r-2)",
    background: "#fff",
    color: "var(--kf-purple)",
    cursor: "pointer",
    transition: "transform .08s ease",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  } as React.CSSProperties,
};
