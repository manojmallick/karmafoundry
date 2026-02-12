import {
  kState,
  kVotes,
  kLb,
  kLbUser,
  kLbName,
  kLbTop,
  kUsers,
  kCfg,
  kMeta,
  kPoll,
  kAudit,
  kContribUser,
  kContribList,
  kTop3,
  kCompletedAt,
  kCompletedNotified,
} from "./keys";
import {
  GameConfig,
  DayState,
  VoteRecord,
  UserRecord,
  LeaderboardEntry,
  TopContributor,
  TopContributorDisplay,
  ContributionEvent,
  ApplyResult,
  StateSyncResponse,
  AuditEvent,
  AuditSyncData,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: GameConfig = {
  dailyGoalEnergy: 10000,
  rolloverHour: 0,
  voteOptions: [
    {
      id: "boost",
      label: "🚀 Energy Boost",
      effect: { energyMultiplier: 2, durationMs: 3600000 }, // 1 hour
    },
    {
      id: "mega",
      label: "⚡ Mega Power",
      effect: { energyMultiplier: 3, durationMs: 1800000 }, // 30 min
    },
    {
      id: "steady",
      label: "🔋 Steady Flow",
      effect: { energyMultiplier: 1.5, durationMs: 7200000 }, // 2 hours
    },
  ],
};

const MAX_CONTRIBUTORS = 200;
const MAX_LEADERBOARD = 25;

function formatDisplayName(userHash: string, explicit?: string): string {
  if (explicit) return explicit;
  if (userHash === "system") return "System";
  const safe = userHash ? userHash.slice(0, 4).toUpperCase() : "ANON";
  return `Player ${safe}...`;
}

export async function addUserPoints(
  kv: any,
  subredditId: string,
  dayKey: string,
  userHash: string,
  displayName: string,
  delta: number
): Promise<void> {
  if (delta <= 0) return;

  const scoreKey = kLbUser(subredditId, dayKey, userHash);
  const current = (await kv.get(scoreKey)) || 0;
  const nextScore = current + delta;
  await kv.set(scoreKey, nextScore);

  const nameKey = kLbName(subredditId, dayKey, userHash);
  await kv.set(nameKey, displayName);

  const topKey = kLbTop(subredditId, dayKey);
  const topList: Array<{ userHash: string; score: number }> = (await kv.get(topKey)) || [];

  const existingIndex = topList.findIndex((entry) => entry.userHash === userHash);
  if (existingIndex >= 0) {
    topList[existingIndex] = { userHash, score: nextScore };
  } else {
    topList.push({ userHash, score: nextScore });
  }

  topList.sort((a, b) => b.score - a.score);
  const trimmed = topList.slice(0, MAX_LEADERBOARD);
  await kv.set(topKey, trimmed);
}

function getDayKey(rolloverHour: number): string {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  
  if (utc.getUTCHours() < rolloverHour) {
    utc.setUTCDate(utc.getUTCDate() - 1);
  }
  
  return utc.toISOString().split("T")[0];
}

export async function loadConfig(kv: any, subredditId: string): Promise<GameConfig> {
  const key = kCfg(subredditId);
  const config = await kv.get(key);
  return config || DEFAULT_CONFIG;
}

export async function loadDayState(kv: any, subredditId: string, dayKey: string): Promise<DayState> {
  const key = kState(subredditId, dayKey);
  const state = await kv.get(key);
  
  if (state) return state;
  
  // Initialize new day
  const cfg = await loadConfig(kv, subredditId);
  const newState: DayState = {
    dayKey,
    startedAt: Date.now(),
    totals: { energy: 0, comments: 0, upvotes: 0 },
    dailyGoal: {
      target: cfg.dailyGoalEnergy,
      achieved: false,
      rewardState: "UNCLAIMED",
    },
  };
  
  await kv.set(key, newState);
  return newState;
}

export async function loadVotes(kv: any, subredditId: string, dayKey: string): Promise<VoteRecord> {
  const key = kVotes(subredditId, dayKey);
  const votes = await kv.get(key);
  return votes || {};
}

export async function loadUsers(kv: any, subredditId: string, dayKey: string): Promise<Record<string, UserRecord>> {
  const key = kUsers(subredditId, dayKey);
  const users = await kv.get(key);
  return users || {};
}

export async function loadLeaderboard(kv: any, subredditId: string, dayKey: string): Promise<LeaderboardEntry[]> {
  const key = kLb(subredditId, dayKey);
  const lb = await kv.get(key);
  return lb || [];
}

export async function rolloverIfNeeded(kv: any, subredditId: string): Promise<{ dayKey: string }> {
  const cfg = await loadConfig(kv, subredditId);
  const dayKey = getDayKey(cfg.rolloverHour);
  
  const metaKey = kMeta(subredditId);
  const meta = await kv.get(metaKey);
  
  if (!meta || meta.lastDayKey !== dayKey) {
    await kv.set(metaKey, { lastDayKey: dayKey, rolledAt: Date.now() });
  }
  
  return { dayKey };
}

async function recordContribution(
  kv: any,
  subredditId: string,
  dayKey: string,
  userHash: string,
  deltaEnergy: number,
  display?: string
): Promise<void> {
  if (deltaEnergy <= 0) return;

  const contribKey = kContribUser(subredditId, dayKey, userHash);
  const current = (await kv.get(contribKey)) || 0;
  const nextTotal = current + deltaEnergy;
  await kv.set(contribKey, nextTotal);

  const users = await loadUsers(kv, subredditId, dayKey);
  const now = Date.now();
  const existing = users[userHash];
  users[userHash] = {
    userHash,
    contribution: nextTotal,
    lastActiveAt: now,
    display: formatDisplayName(userHash, display ?? existing?.display),
  };
  await kv.set(kUsers(subredditId, dayKey), users);

  const listKey = kContribList(subredditId, dayKey);
  const list: string[] = (await kv.get(listKey)) || [];
  list.push(userHash);
  if (list.length > MAX_CONTRIBUTORS) {
    list.splice(0, list.length - MAX_CONTRIBUTORS);
  }
  await kv.set(listKey, list);

  const unique = Array.from(new Set(list));
  const totals = await Promise.all(
    unique.map(async (hash) => {
      const score = (await kv.get(kContribUser(subredditId, dayKey, hash))) || 0;
      return { userHash: hash, score } as TopContributor;
    })
  );

  const top3 = totals
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  await kv.set(kTop3(subredditId, dayKey), top3);
}

export async function applyContributions(
  kv: any,
  subredditId: string,
  dayKey: string,
  cfg: GameConfig,
  events: ContributionEvent[],
  source?: { userHash: string; display?: string }
): Promise<ApplyResult> {
  const state = await loadDayState(kv, subredditId, dayKey);
  
  let totalDelta = 0;
  const now = Date.now();
  
  // Check active multiplier
  let multiplier = 1;
  let appliedMultiplier: ApplyResult["appliedMultiplier"];
  
  if (state.activeMultiplier && state.activeMultiplier.expiresAt > now) {
    multiplier = state.activeMultiplier.value;
    appliedMultiplier = {
      value: multiplier,
      durationMs: state.activeMultiplier.expiresAt - now,
    };
  } else if (state.activeMultiplier) {
    // Expired, remove it
    delete state.activeMultiplier;
  }
  
  for (const event of events) {
    const baseEnergy = event.count * event.baseEnergyPerEvent;
    const finalEnergy = Math.floor(baseEnergy * multiplier);
    totalDelta += finalEnergy;
    
    if (event.kind === "COMMENT") {
      state.totals.comments += event.count;
    } else if (event.kind === "UPVOTE") {
      state.totals.upvotes += event.count;
    }
  }
  
  state.totals.energy += totalDelta;
  
  // Check if goal achieved
  if (!state.dailyGoal.achieved && state.totals.energy >= state.dailyGoal.target) {
    state.dailyGoal.achieved = true;
    const completedAtKey = kCompletedAt(subredditId, dayKey);
    const existingCompletedAt = await kv.get(completedAtKey);
    if (!existingCompletedAt) {
      await kv.set(completedAtKey, Date.now());
    }
  }
  
  await kv.set(kState(subredditId, dayKey), state);

  if (totalDelta > 0 && source?.userHash) {
    await recordContribution(
      kv,
      subredditId,
      dayKey,
      source.userHash,
      totalDelta,
      source.display
    );
  }
  
  return {
    deltaEnergy: totalDelta,
    appliedMultiplier,
  };
}

export async function castVote(
  kv: any,
  subredditId: string,
  dayKey: string,
  userHash: string,
  optionId: string
): Promise<void> {
  const cfg = await loadConfig(kv, subredditId);
  const option = cfg.voteOptions.find((o) => o.id === optionId);
  
  if (!option) throw new Error("Invalid option");
  
  const votes = await loadVotes(kv, subredditId, dayKey);
  votes[userHash] = { optionId, votedAt: Date.now() };
  await kv.set(kVotes(subredditId, dayKey), votes);
  
  // Apply multiplier if this vote wins (simplified: apply immediately)
  if (option.effect.energyMultiplier && option.effect.durationMs) {
    const state = await loadDayState(kv, subredditId, dayKey);
    const now = Date.now();
    
    state.activeMultiplier = {
      optionId,
      value: option.effect.energyMultiplier,
      expiresAt: now + option.effect.durationMs,
      durationMs: option.effect.durationMs,
    };
    
    await kv.set(kState(subredditId, dayKey), state);
  }
}

export async function claimDailyReward(
  kv: any,
  subredditId: string,
  dayKey: string
): Promise<DayState> {
  const state = await loadDayState(kv, subredditId, dayKey);
  
  if (state.dailyGoal.achieved && state.dailyGoal.rewardState === "UNCLAIMED") {
    state.dailyGoal.rewardState = "CLAIMED";
    await kv.set(kState(subredditId, dayKey), state);

    // Record audit event for claim
    await pushAuditEvent(kv, subredditId, dayKey, {
      type: "REWARD_CLAIMED",
      at: Date.now(),
      source: "USER",
      meta: { dayKey },
    });
  }
  
  return state;
}

// ---- Audit helpers ----

export async function pushAuditEvent(
  kv: any,
  subredditId: string,
  dayKey: string,
  event: AuditEvent
): Promise<void> {
  const key = kAudit(subredditId, dayKey);
  const events: AuditEvent[] = (await kv.get(key)) || [];
  events.push(event);
  // Keep only last 10
  while (events.length > 10) events.shift();
  await kv.set(key, events);
}

export async function getAuditEvents(
  kv: any,
  subredditId: string,
  dayKey: string
): Promise<AuditEvent[]> {
  const key = kAudit(subredditId, dayKey);
  return (await kv.get(key)) || [];
}

// ---- Demo boost ----

export async function applyDemoBoost(
  kv: any,
  subredditId: string,
  dayKey: string,
  cfg: GameConfig
): Promise<ApplyResult> {
  return applyContributions(
    kv,
    subredditId,
    dayKey,
    cfg,
    [
      { kind: "COMMENT", count: 7, baseEnergyPerEvent: 6 },
      { kind: "UPVOTE", count: 5, baseEnergyPerEvent: 2 },
    ],
    { userHash: "system", display: "System" }
  );
}

// ---- Admin: Reset Day ----

export async function resetDayState(
  kv: any,
  subredditId: string,
  dayKey: string,
  actorHash: string
): Promise<{ ok: true; dayKey: string; resetAtMs: number }> {
  const cfg = await loadConfig(kv, subredditId);
  const resetAtMs = Date.now();

  // Fresh day state
  const freshState: DayState = {
    dayKey,
    startedAt: resetAtMs,
    totals: { energy: 0, comments: 0, upvotes: 0 },
    dailyGoal: {
      target: cfg.dailyGoalEnergy,
      achieved: false,
      rewardState: "UNCLAIMED",
    },
  };

  // Clear day-scoped keys
  await Promise.all([
    kv.set(kState(subredditId, dayKey), freshState),
    kv.set(kVotes(subredditId, dayKey), {}),
    kv.set(kUsers(subredditId, dayKey), {}),
    kv.set(kLb(subredditId, dayKey), []),
    kv.set(kLbTop(subredditId, dayKey), []),
    kv.set(kContribList(subredditId, dayKey), []),
    kv.set(kTop3(subredditId, dayKey), []),
    kv.set(kAudit(subredditId, dayKey), []),
    kv.delete(kPoll(subredditId, dayKey)),
    kv.delete(kCompletedAt(subredditId, dayKey)),
    kv.delete(kCompletedNotified(subredditId, dayKey)),
  ]);

  // Record the reset as an audit event
  await pushAuditEvent(kv, subredditId, dayKey, {
    type: "ADMIN_RESET_DAY",
    source: actorHash,
    at: resetAtMs,
    meta: { actor: actorHash },
  });

  return { ok: true, dayKey, resetAtMs };
}

// ---- Downvote penalty ----

export interface PenaltyResult {
  deltaEnergyApplied: number;
}

export async function applyPenalty(
  kv: any,
  subredditId: string,
  dayKey: string,
  opts: { deltaEnergy: number; reason: string }
): Promise<PenaltyResult> {
  const state = await loadDayState(kv, subredditId, dayKey);

  // Subtract energy but never below 0
  const actualPenalty = Math.min(opts.deltaEnergy, state.totals.energy);
  state.totals.energy -= actualPenalty;

  // Un-achieve goal if energy dropped below target
  if (state.totals.energy < state.dailyGoal.target && state.dailyGoal.achieved) {
    // Only un-achieve if reward not yet claimed
    if (state.dailyGoal.rewardState === "UNCLAIMED") {
      state.dailyGoal.achieved = false;
    }
  }

  await kv.set(kState(subredditId, dayKey), state);

  return { deltaEnergyApplied: actualPenalty };
}

// ---- State sync ----

export async function getStateSync(
  kv: any,
  subredditId: string,
  userHash: string
): Promise<StateSyncResponse> {
  const { dayKey } = await rolloverIfNeeded(kv, subredditId);
  const state = await loadDayState(kv, subredditId, dayKey);
  const votes = await loadVotes(kv, subredditId, dayKey);
  const users = await loadUsers(kv, subredditId, dayKey);
  const auditEvents = await getAuditEvents(kv, subredditId, dayKey);

  const topList: Array<{ userHash: string; score: number }> =
    (await kv.get(kLbTop(subredditId, dayKey))) || [];
  const leaderboardTop = await Promise.all(
    topList.map(async (entry) => {
      const name = await kv.get(kLbName(subredditId, dayKey, entry.userHash));
      const display =
        name || formatDisplayName(entry.userHash, undefined);
      return { display, score: entry.score };
    })
  );

  const top3Raw: TopContributor[] = (await kv.get(kTop3(subredditId, dayKey))) || [];
  const top3Contributors: TopContributorDisplay[] = top3Raw.map((entry) => {
    const display = users[entry.userHash]?.display || formatDisplayName(entry.userHash);
    return { display, score: entry.score };
  });

  // Poll cursor for audit deltas
  const pollCursor = await kv.get(kPoll(subredditId, dayKey));

  const now = Date.now();
  const multiplierActive = !!(
    state.activeMultiplier &&
    state.activeMultiplier.expiresAt > now
  );

  const rewardClaimed = state.dailyGoal.rewardState === "CLAIMED";
  const rewardAvailable =
    state.dailyGoal.achieved &&
    state.totals.energy >= state.dailyGoal.target &&
    !rewardClaimed;

  let completedAt = await kv.get(kCompletedAt(subredditId, dayKey));
  if (state.dailyGoal.achieved && !completedAt) {
    completedAt = Date.now();
    await kv.set(kCompletedAt(subredditId, dayKey), completedAt);
  }

  const notifiedKey = kCompletedNotified(subredditId, dayKey);
  let justCompleted = false;
  if (state.dailyGoal.achieved && !rewardClaimed && completedAt) {
    const alreadyNotified = await kv.get(notifiedKey);
    if (!alreadyNotified) {
      justCompleted = true;
      await kv.set(notifiedKey, Date.now());
    }
  }

  const audit: AuditSyncData = {
    dayKey,
    lastPollAt: pollCursor?.updatedAt ?? null,
    lastDeltaComments: pollCursor?.totalDeltaComments ?? 0,
    lastDeltaUpvotes: pollCursor?.totalDeltaUpvotes ?? 0,
    lastDeltaDown: pollCursor?.totalDeltaDown ?? 0,
    multiplierActive,
    multiplierValue: multiplierActive ? state.activeMultiplier!.value : null,
    multiplierExpiresAt: multiplierActive
      ? state.activeMultiplier!.expiresAt
      : null,
    last10Events: auditEvents,
  };

  return {
    dayKey,
    totals: state.totals,
    dailyGoal: state.dailyGoal,
    activeMultiplier: state.activeMultiplier,
    userHasVoted: !!votes[userHash],
    userContribution: users[userHash]?.contribution || 0,
    leaderboard: [],
    leaderboardTop,
    top3Contributors,
    rewardClaimed,
    rewardAvailable,
    canDemo: false,
    victory: {
      isComplete: state.dailyGoal.achieved,
      justCompleted,
      completedAt: completedAt || undefined,
    },
    audit,
  };
}
