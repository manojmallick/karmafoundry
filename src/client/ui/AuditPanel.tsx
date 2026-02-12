import React, { useState } from "react";
import {
  RESET_TZ_LABEL,
  KV_PREFIX,
  POLL_INTERVAL_SEC,
  CAP_COMMENTS,
  CAP_UPVOTES,
} from "../../shared/constants";

interface AuditEvent {
  type: string;
  at: number;
  source?: string;
  deltaEnergy?: number;
  multiplier?: number | null;
  meta?: Record<string, unknown>;
}

interface AuditData {
  dayKey: string;
  lastPollAt: number | null;
  lastDeltaComments: number;
  lastDeltaUpvotes: number;
  multiplierActive: boolean;
  multiplierValue: number | null;
  multiplierExpiresAt: number | null;
  last10Events: AuditEvent[];
}

interface AuditPanelProps {
  audit: AuditData | null;
  actualEnergy: number;
  displayEnergy: number;
  goal: number;
  bossHp: number;
  isClamped: boolean;
  canDemo?: boolean;
  onResetDay?: () => void;
  resetLoading?: boolean;
}

function formatTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString();
}

export function AuditPanel({ audit, actualEnergy, displayEnergy, goal, bossHp, isClamped, canDemo, onResetDay, resetLoading }: AuditPanelProps) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleCopyJson = () => {
    const blob = { audit, actualEnergy, displayEnergy, goal, bossHp, isClamped, canDemo, copiedAt: Date.now() };
    navigator.clipboard.writeText(JSON.stringify(blob, null, 2)).then(() => {
      // brief visual feedback via button text change
    });
  };

  return (
    <div style={styles.wrapper}>
      <button
        style={styles.toggle}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▼ Audit" : "▶ Audit"}
      </button>

      {open && (
        <div style={styles.panel}>
          {audit ? (
            <>
              {/* ---- Proof Section ---- */}
              <div style={styles.proofSection}>
                <div style={styles.proofTitle}>Proof</div>
                <div style={styles.proofRow}>
                  <span>Reset:</span>
                  <span style={styles.proofValue}>{RESET_TZ_LABEL}</span>
                </div>
                <div style={styles.proofRow}>
                  <span>KV prefix:</span>
                  <span style={styles.proofValue}>{KV_PREFIX}</span>
                </div>
                <div style={styles.proofRow}>
                  <span>Polling:</span>
                  <span style={styles.proofValue}>
                    every {POLL_INTERVAL_SEC}s, caps: {CAP_COMMENTS} comments / {CAP_UPVOTES} upvotes
                  </span>
                </div>
                {canDemo && (
                  <div style={styles.proofRow}>
                    <span>Demo:</span>
                    <span style={{ ...styles.proofValue, color: "#f5af19" }}>enabled (mod-only)</span>
                  </div>
                )}
              </div>

              <div style={styles.divider} />

              <div style={styles.row}>
                <span style={styles.label}>dayKey</span>
                <span style={styles.value}>{audit.dayKey}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Energy (Displayed)</span>
                <span style={styles.value}>
                  {displayEnergy.toLocaleString()} / {goal.toLocaleString()}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Energy (Actual)</span>
                <span style={styles.value}>
                  {actualEnergy.toLocaleString()} / {goal.toLocaleString()}
                  {isClamped && <span style={styles.clampedNote}> (clamped)</span>}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Boss HP</span>
                <span style={styles.value}>{bossHp.toLocaleString()}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Last poll</span>
                <span style={styles.value}>
                  {formatTime(audit.lastPollAt)}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Δ Comments</span>
                <span style={styles.value}>{audit.lastDeltaComments}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Δ Upvotes</span>
                <span style={styles.value}>{audit.lastDeltaUpvotes}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Δ Downvotes (net)</span>
                <span style={{
                  ...styles.value,
                  ...(audit.lastDeltaDown > 0 ? { color: "#ff6b6b" } : {}),
                }}>
                  {audit.lastDeltaDown > 0 ? `-${audit.lastDeltaDown}` : "0"}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Multiplier</span>
                <span style={styles.value}>
                  {audit.multiplierActive
                    ? `${audit.multiplierValue}x (until ${formatTime(
                        audit.multiplierExpiresAt
                      )})`
                    : "None"}
                </span>
              </div>

              <div style={styles.divider} />
              <div style={styles.eventsTitle}>Last 10 Events</div>

              {audit.last10Events.length === 0 && (
                <div style={styles.empty}>No events yet</div>
              )}

              {audit.last10Events.map((ev, i) => (
                <div key={i} style={styles.event}>
                  <span style={styles.eventTime}>
                    {formatTime(ev.at)}
                  </span>
                  <span style={{
                    ...styles.eventType,
                    ...(ev.type === "DOWNVOTE_PRESSURE" ? { color: "#ff6b6b" } : {}),
                  }}>
                    {ev.type}
                  </span>
                  {ev.deltaEnergy != null && (
                    <span style={{
                      ...styles.eventDelta,
                      ...(ev.deltaEnergy < 0 ? { color: "#ff6b6b" } : {}),
                    }}>
                      {ev.deltaEnergy >= 0 ? `+${ev.deltaEnergy}` : `${ev.deltaEnergy}`}
                    </span>
                  )}
                </div>
              ))}

              <button style={styles.copyBtn} onClick={handleCopyJson}>
                📋 Copy JSON
              </button>

              {/* ---- Admin Tools (mod-only) ---- */}
              {canDemo && (
                <>
                  <div style={styles.divider} />
                  <div style={styles.adminTitle}>Admin Tools (mod-only)</div>
                  {!confirmReset ? (
                    <button
                      style={styles.adminBtn}
                      onClick={() => setConfirmReset(true)}
                      disabled={resetLoading}
                    >
                      🔄 Reset Day (mod-only)
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        style={{ ...styles.adminBtn, background: "#c0392b", flex: 1 }}
                        onClick={() => {
                          setConfirmReset(false);
                          onResetDay?.();
                        }}
                        disabled={resetLoading}
                      >
                        {resetLoading ? "Resetting…" : "⚠️ Confirm Reset"}
                      </button>
                      <button
                        style={{ ...styles.adminBtn, flex: 0 }}
                        onClick={() => setConfirmReset(false)}
                        disabled={resetLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={styles.empty}>Loading audit data...</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    top: "60px",
    right: "12px",
    zIndex: 1200,
    pointerEvents: "auto",
  } as React.CSSProperties,
  toggle: {
    padding: "6px 14px",
    fontSize: "11px",
    fontWeight: 800,
    fontFamily: "var(--kf-font-body)",
    background: "rgba(7, 10, 20, 0.88)",
    color: "var(--kf-text-mute)",
    border: "1px solid var(--kf-border)",
    borderRadius: "var(--kf-r-1)",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
  } as React.CSSProperties,
  panel: {
    marginTop: "6px",
    width: "290px",
    maxHeight: "440px",
    overflowY: "auto",
    background: "rgba(7, 10, 20, 0.94)",
    backdropFilter: "blur(14px)",
    border: "1px solid var(--kf-border)",
    borderRadius: "var(--kf-r-2)",
    padding: "14px",
    fontSize: "12px",
    color: "var(--kf-text-dim)",
    boxShadow: "var(--kf-shadow-2)",
  } as React.CSSProperties,
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "3px 0",
  } as React.CSSProperties,
  label: {
    color: "var(--kf-text-mute)",
    fontWeight: 600,
    fontSize: "11px",
  } as React.CSSProperties,
  value: {
    color: "var(--kf-text)",
    fontFamily: "monospace",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  clampedNote: {
    color: "var(--kf-gold)",
    fontSize: "11px",
    fontStyle: "italic",
    marginLeft: "6px",
  } as React.CSSProperties,
  proofSection: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    fontSize: "11px",
    color: "var(--kf-text-mute)",
    fontFamily: "monospace",
  } as React.CSSProperties,
  proofTitle: {
    fontWeight: 800,
    color: "var(--kf-text-dim)",
    marginBottom: "2px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  proofRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "6px",
  } as React.CSSProperties,
  proofValue: {
    color: "var(--kf-text-mute)",
    textAlign: "right",
  } as React.CSSProperties,
  divider: {
    height: "1px",
    background: "var(--kf-border)",
    margin: "10px 0",
  } as React.CSSProperties,
  eventsTitle: {
    fontWeight: 800,
    color: "var(--kf-text-dim)",
    marginBottom: "6px",
    fontSize: "11px",
  } as React.CSSProperties,
  empty: {
    color: "var(--kf-text-mute)",
    fontStyle: "italic",
  } as React.CSSProperties,
  event: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "3px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  } as React.CSSProperties,
  eventTime: {
    color: "var(--kf-text-mute)",
    fontFamily: "monospace",
    fontSize: "10px",
    fontVariantNumeric: "tabular-nums",
    minWidth: "70px",
  } as React.CSSProperties,
  eventType: {
    color: "var(--kf-mint)",
    fontWeight: 700,
    flex: 1,
    fontSize: "11px",
  } as React.CSSProperties,
  eventDelta: {
    color: "var(--kf-gold)",
    fontWeight: 700,
    fontFamily: "monospace",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  copyBtn: {
    marginTop: "10px",
    width: "100%",
    padding: "8px",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "var(--kf-font-body)",
    background: "var(--kf-surface)",
    color: "var(--kf-text-dim)",
    border: "1px solid var(--kf-border)",
    borderRadius: "var(--kf-r-1)",
    cursor: "pointer",
  } as React.CSSProperties,
  adminTitle: {
    fontWeight: 800,
    color: "var(--kf-gold)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  } as React.CSSProperties,
  adminBtn: {
    width: "100%",
    padding: "10px",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "var(--kf-font-body)",
    background: "rgba(255, 77, 109, 0.12)",
    color: "var(--kf-danger)",
    border: "1px solid rgba(255, 77, 109, 0.25)",
    borderRadius: "var(--kf-r-1)",
    cursor: "pointer",
    marginBottom: "4px",
  } as React.CSSProperties,
};
