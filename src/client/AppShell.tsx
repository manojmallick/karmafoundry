import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { CanvasStage } from "./CanvasStage";
import { usePoller } from "./usePoller";
import { useStateSync } from "./useStateSync";
import { gmBridge } from "./bridge";
import { postDemoBoost, postClaim, postResetDay } from "./api";
import { POLL_INTERVAL_SEC } from "../shared/constants";
import { TopBar } from "./ui/TopBar";
import { BottomActions } from "./ui/BottomActions";
import { VotePanel } from "./ui/VotePanel";
import { LeaderboardPanel } from "./ui/LeaderboardPanel";
import { TutorialModal } from "./ui/TutorialModal";
import { RewardModal } from "./ui/RewardModal";
import { ToastStack } from "./ui/ToastStack";
import { AuditPanel } from "./ui/AuditPanel";
import { VictoryOverlay } from "./ui/VictoryOverlay";

type Screen = "GAME" | "VOTE" | "LEADERBOARD" | "TUTORIAL" | "REWARD";

interface Toast {
  id: number;
  message: string;
  type: "success" | "info" | "boost";
}

export function AppShell() {
  const [screen, setScreen] = useState<Screen>("GAME");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showReward, setShowReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [victory, setVictory] = useState<{
    active: boolean;
    phase: "SHAKE" | "OVERLAY" | "DONE";
    startedAt: number | null;
    top3: Array<{ display: string; score: number }>;
  }>({ active: false, phase: "DONE", startedAt: null, top3: [] });
  const victoryTimers = useRef<number[]>([]);

  // State management
  const [syncEnabled, setSyncEnabled] = useState(true);
  const { state, refetch } = useStateSync(POLL_INTERVAL_SEC * 1000, syncEnabled);

  useEffect(() => {
    const unsubscribe = gmBridge.listen(() => {});
    return () => unsubscribe();
  }, []);

  // Derived values
  const actualEnergy = state?.totals?.energy ?? 0;
  const goal = state?.dailyGoal?.target ?? 10000;
  const isComplete = actualEnergy >= goal;
  const bossHpMax = goal;
  const bossHp = Math.max(0, goal - actualEnergy);
  const bossHpPct = bossHpMax > 0 ? bossHp / bossHpMax : 1;
  
  // Clamp displayed energy at goal when complete
  const displayEnergy = isComplete ? goal : Math.min(actualEnergy, goal);
  const energyPct = Math.min(100, (displayEnergy / goal) * 100);
  const canClaim = isComplete && !rewardClaimed;

  // Disable syncing when victory is active or forge is complete
  useEffect(() => {
    setSyncEnabled(!(victory.active || isComplete));
  }, [victory.active, isComplete]);
  const top3FromState = useMemo(
    () => state?.top3Contributors ?? [],
    [state?.top3Contributors]
  );

  // Track claimed from server
  useEffect(() => {
    if (state?.rewardClaimed) {
      setRewardClaimed(true);
    }
  }, [state?.rewardClaimed]);

  useEffect(() => {
    if (state?.victory?.justCompleted && !victory.active) {
      setVictory({
        active: true,
        phase: "SHAKE",
        startedAt: Date.now(),
        top3: top3FromState,
      });
    }
  }, [state?.victory?.justCompleted, top3FromState, victory.active]);

  useEffect(() => {
    if (!victory.active) return;

    victoryTimers.current.forEach((id) => clearTimeout(id));
    victoryTimers.current = [];

    gmBridge.send({ type: "CINEMATIC_START" });

    const shakeTimeout = window.setTimeout(() => {
      setVictory((prev) => ({ ...prev, phase: "OVERLAY" }));
      gmBridge.send({ type: "CINEMATIC_VICTORY" });
    }, 600);

    const endTimeout = window.setTimeout(() => {
      setVictory((prev) => ({ ...prev, active: false, phase: "DONE" }));
      gmBridge.send({ type: "CINEMATIC_END" });
    }, 5000);

    victoryTimers.current.push(shakeTimeout, endTimeout);

    return () => {
      victoryTimers.current.forEach((id) => clearTimeout(id));
      victoryTimers.current = [];
    };
  }, [victory.active]);

  // Check if reward should be shown
  useEffect(() => {
    if (
      state?.dailyGoal?.achieved &&
      state?.dailyGoal?.rewardState === "UNCLAIMED" &&
      !showReward &&
      !rewardClaimed
    ) {
      setShowReward(true);
    }
  }, [state, showReward, rewardClaimed]);

  // Add toast
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle boost from poller
  const handleBoost = useCallback(
    (boost: any) => {
      addToast(
        `+${boost.deltaEnergy} energy from ${boost.source}!`,
        "boost"
      );

      gmBridge.send({
        type: "BOOST_APPLIED",
        payload: boost,
      });
    },
    [addToast]
  );

  // Handle downvote penalty from poller
  const handlePenalty = useCallback(
    (penalty: any) => {
      if (penalty?.deltaEnergyApplied > 0) {
        addToast(
          `⚠️ Downvote pressure: -${penalty.deltaEnergyApplied} energy`,
          "info"
        );
      }
    },
    [addToast]
  );

  // Poll for contributions (disabled during victory or when forge complete)
  const [pollEnabled, setPollEnabled] = useState(true);
  usePoller(POLL_INTERVAL_SEC * 1000, handleBoost, pollEnabled, handlePenalty);

  // Update polling enabled state
  useEffect(() => {
    setPollEnabled(!(victory.active || isComplete));
  }, [victory.active, isComplete]);

  // ---- Demo Boost ----
  const handleDemoBoost = useCallback(async () => {
    setBoostLoading(true);
    try {
      const data = await postDemoBoost();
      if (data?.boost) {
        addToast(
          `⚡ Boost +${data.boost.deltaEnergy} energy${
            data.boost.multiplier ? ` (${data.boost.multiplier}x)` : ""
          }`,
          "boost"
        );
        gmBridge.send({
          type: "BOOST_APPLIED",
          payload: data.boost,
        });
      }
      await refetch();
    } catch (err) {
      console.error("Demo boost error:", err);
      addToast("Boost failed", "info");
    } finally {
      setBoostLoading(false);
    }
  }, [addToast, refetch]);

  // ---- Claim Reward ----
  const handleClaimReward = useCallback(async () => {
    setClaimLoading(true);
    try {
      const data = await postClaim();
      if (data?.ok) {
        setRewardClaimed(true);
        addToast("Reward claimed! 🎉", "success");
        gmBridge.send({
          type: "REWARD_CLAIMED",
          payload: {
            dayKey: state?.dayKey,
          },
        });
      }
      await refetch();
    } catch (err) {
      console.error("Claim failed:", err);
      addToast("Claim failed", "info");
    } finally {
      setClaimLoading(false);
    }
  }, [addToast, refetch, state?.dayKey]);

  // ---- Reset Day (admin/mod-only) ----
  const handleResetDay = useCallback(async () => {
    setResetLoading(true);
    try {
      const data = await postResetDay();
      if (data?.ok) {
        // Re-enable syncing/polling after reset
        setSyncEnabled(true);
        setPollEnabled(true);
        setRewardClaimed(false);
        setVictory({ active: false, phase: "DONE", startedAt: null, top3: [] });
        addToast("Day reset (mod-only)", "info");
        await refetch();
      }
    } catch (err: any) {
      console.error("Reset day failed:", err);
      addToast(err?.message || "Reset failed", "info");
    } finally {
      setResetLoading(false);
    }
  }, [addToast, refetch]);

  // Vote options from config (or default)
  const voteOptions = [
    {
      id: "boost",
      label: "🚀 Energy Boost",
      effect: { energyMultiplier: 2, durationMs: 3600000 },
    },
    {
      id: "mega",
      label: "⚡ Mega Power",
      effect: { energyMultiplier: 3, durationMs: 1800000 },
    },
    {
      id: "steady",
      label: "🔋 Steady Flow",
      effect: { energyMultiplier: 1.5, durationMs: 7200000 },
    },
  ];

  const handleVoted = () => {
    addToast("Vote cast successfully!", "success");
  };

  const handleRewardClaimed = () => {
    setRewardClaimed(true);
    addToast("Reward claimed! 🎉", "success");
  };

  return (
    <div
      style={{
        ...styles.container,
        ...(victory.phase === "SHAKE" ? styles.shake : {}),
      }}
    >
      {/* GameMaker Canvas */}
      <div style={styles.gameLayer}>
        <CanvasStage gameUrl="/gamemaker/index.html" />
      </div>

      {/* React Overlay */}
      <div style={styles.overlayLayer}>
        <TopBar
          twist={state?.activeMultiplier ? "Multiplier Active" : undefined}
          multiplier={state?.activeMultiplier?.value}
          multiplierExpiry={state?.activeMultiplier?.expiresAt}
          canDemo={state?.canDemo}
        />

        <div style={styles.middle}>
          {state && (
            <div style={styles.barsContainer}>
              {/* Boss HP Bar */}
              <div style={styles.barSection}>
                <div style={styles.barLabel}>
                  {bossHp === 0 ? "💀 Boss Defeated!" : `👹 Boss HP: ${bossHp.toLocaleString()} / ${bossHpMax.toLocaleString()}`}
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.bossHpFill,
                      width: `${bossHpPct * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Energy Progress */}
              <div style={styles.barSection}>
                <div style={styles.barLabel}>
                  {isComplete
                    ? "🏭 Forge Complete!"
                    : `⚡ Energy: ${displayEnergy.toLocaleString()} / ${goal.toLocaleString()}`}
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${energyPct}%`,
                      ...(isComplete ? styles.progressFillComplete : {}),
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <BottomActions
          onVote={() => setScreen("VOTE")}
          onLeaderboard={() => setScreen("LEADERBOARD")}
          onTutorial={() => setScreen("TUTORIAL")}
          onDemoBoost={handleDemoBoost}
          onClaim={handleClaimReward}
          hasVoted={state?.userHasVoted || false}
          isComplete={isComplete}
          rewardClaimed={rewardClaimed}
          claimLoading={claimLoading}
          boostLoading={boostLoading}
          disabled={victory.active}
          canDemo={state?.canDemo}
        />
      </div>

      {/* Audit Panel */}
      <AuditPanel
        audit={state?.audit ?? null}
        actualEnergy={actualEnergy}
        displayEnergy={displayEnergy}
        goal={goal}
        bossHp={bossHp}
        isClamped={isComplete && actualEnergy > goal}
        canDemo={state?.canDemo}
        onResetDay={handleResetDay}
        resetLoading={resetLoading}
      />

      {victory.phase === "SHAKE" && <div style={styles.flash} />}

      {/* Panels and Modals */}
      {screen === "VOTE" && (
        <VotePanel
          options={voteOptions}
          onClose={() => setScreen("GAME")}
          onVoted={handleVoted}
        />
      )}

      {screen === "LEADERBOARD" && (
        <LeaderboardPanel
          entries={state?.leaderboardTop || []}
          onClose={() => setScreen("GAME")}
        />
      )}

      {screen === "TUTORIAL" && (
        <TutorialModal onClose={() => setScreen("GAME")} />
      )}

      {showReward && !rewardClaimed && (
        <RewardModal
          onClose={() => setShowReward(false)}
          onClaimed={handleRewardClaimed}
        />
      )}

      {victory.active && victory.phase === "OVERLAY" && (
        <VictoryOverlay
          entries={victory.top3}
          canClaim={canClaim}
          claimLoading={claimLoading}
          onClaim={handleClaimReward}
        />
      )}

      {/* Toasts */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "var(--kf-font-body)",
    background:
      "radial-gradient(1000px 600px at 50% 20%, rgba(124,92,255,0.25), transparent 60%), " +
      "radial-gradient(800px 600px at 20% 80%, rgba(18,214,223,0.15), transparent 55%), " +
      "linear-gradient(180deg, #070A14 0%, #0B1024 55%, #070A14 100%)",
  } as React.CSSProperties,
  gameLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  } as React.CSSProperties,
  overlayLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    pointerEvents: "none",
  } as React.CSSProperties,
  shake: {
    animation: "kf-shake 600ms ease-out",
  } as React.CSSProperties,
  flash: {
    position: "fixed",
    inset: 0,
    background: "rgba(255, 255, 255, 0.9)",
    animation: "kf-flash 600ms ease-out",
    zIndex: 2400,
    pointerEvents: "none",
  } as React.CSSProperties,
  middle: {
    flex: 1,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: "20px",
    pointerEvents: "none",
  } as React.CSSProperties,
  barsContainer: {
    pointerEvents: "auto",
    background: "rgba(7, 10, 20, 0.82)",
    backdropFilter: "blur(14px)",
    padding: "16px 20px",
    borderRadius: "var(--kf-r-3)",
    border: "1px solid var(--kf-border)",
    minWidth: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    boxShadow: "var(--kf-shadow-1)",
  } as React.CSSProperties,
  barSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  } as React.CSSProperties,
  barLabel: {
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: "var(--kf-font-head)",
    color: "var(--kf-text)",
    textAlign: "center",
    letterSpacing: "-0.01em",
  } as React.CSSProperties,
  progressBar: {
    width: "100%",
    height: "14px",
    background: "rgba(0, 0, 0, 0.35)",
    border: "1px solid var(--kf-border)",
    borderRadius: "999px",
    overflow: "hidden",
    padding: "2px",
  } as React.CSSProperties,
  progressFill: {
    height: "100%",
    background: "var(--kf-grad-cta)",
    borderRadius: "999px",
    boxShadow: "0 4px 14px rgba(107, 255, 184, 0.14)",
    transition: "width 0.4s ease",
  } as React.CSSProperties,
  progressFillComplete: {
    background: "var(--kf-grad-gold)",
    boxShadow: "0 4px 14px rgba(247, 201, 72, 0.18)",
  } as React.CSSProperties,
  bossHpFill: {
    height: "100%",
    background: "var(--kf-grad-boss)",
    borderRadius: "999px",
    boxShadow: "0 4px 14px rgba(255, 77, 109, 0.14)",
    transition: "width 0.4s ease",
  } as React.CSSProperties,
};
