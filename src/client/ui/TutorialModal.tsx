import React from "react";
import { RESET_TZ_LABEL } from "../../shared/constants";

interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>How KarmaFoundry works</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.content}>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <span style={styles.icon}>⚡</span>
              <span>Upvotes + comments → energy</span>
            </li>
            <li style={styles.listItem}>
              <span style={styles.icon}>🗳️</span>
              <span>Daily twist vote → multiplier</span>
            </li>
            <li style={styles.listItem}>
              <span style={styles.icon}>🎁</span>
              <span>Claim once per day → resets at {RESET_TZ_LABEL}</span>
            </li>
          </ul>

          <p style={styles.auditHint}>
            <span style={styles.icon}>🔎</span>
            Audit panel shows exact deltas + KV state
          </p>
        </div>

        <div style={styles.footer}>
          <button style={styles.primaryButton} onClick={onClose}>
            Got It!
          </button>
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
  modal: {
    background: "rgba(11, 16, 36, 0.95)",
    border: "1px solid var(--kf-border)",
    borderRadius: "var(--kf-r-3)",
    width: "90%",
    maxWidth: "460px",
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
    padding: "28px 24px",
  } as React.CSSProperties,
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  } as React.CSSProperties,
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "15px",
    lineHeight: "1.5",
    color: "var(--kf-text-dim)",
  } as React.CSSProperties,
  icon: {
    fontSize: "20px",
    flexShrink: 0,
    width: "28px",
    textAlign: "center",
  } as React.CSSProperties,
  auditHint: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid var(--kf-border)",
    fontSize: "13px",
    color: "var(--kf-text-mute)",
    lineHeight: "1.4",
  } as React.CSSProperties,
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid var(--kf-border)",
    display: "flex",
    justifyContent: "flex-end",
  } as React.CSSProperties,
  primaryButton: {
    padding: "12px 28px",
    fontSize: "15px",
    border: "none",
    borderRadius: "var(--kf-r-2)",
    background: "var(--kf-grad-cta)",
    color: "rgba(10, 12, 20, 0.92)",
    cursor: "pointer",
    fontWeight: 800,
    fontFamily: "var(--kf-font-body)",
    boxShadow: "0 6px 18px rgba(18, 214, 223, 0.18)",
  } as React.CSSProperties,
};
