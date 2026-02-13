export interface GameConfig {
  dailyGoalEnergy: number;
  rolloverHour: number;
  voteOptions: VoteOption[];
}

export interface VoteOption {
  id: string;
  label: string;
  effect: {
    energyMultiplier?: number;
    durationMs?: number;
  };
}

export interface DayState {
  dayKey: string;
  startedAt: number;
  totals: {
    energy: number;
    comments: number;
    upvotes: number;
  };
  dailyGoal: {
    target: number;
    achieved: boolean;
    rewardState: "UNCLAIMED" | "CLAIMED";
  };
  activeMultiplier?: {
    optionId: string;
    value: number;
    expiresAt: number;
    durationMs: number;
  };
}

export interface UserRecord {
  userHash: string;
  contribution: number;
  lastActiveAt: number;
  display?: string;
}

export interface VoteRecord {
  [userHash: string]: {
    optionId: string;
    votedAt: number;
  };
}

export interface LeaderboardEntry {
  userHash: string;
  score: number;
  rank: number;
}

export interface TopContributor {
  userHash: string;
  score: number;
}

export interface TopContributorDisplay {
  display: string;
  score: number;
}

export interface PollCursor {
  lastCommentCount: number;
  lastScore: number;
  lastDeltaDown: number;
  updatedAt: number;
}

export interface ContributionEvent {
  kind: "COMMENT" | "UPVOTE" | "SYSTEM";
  count: number;
  baseEnergyPerEvent: number;
}

export interface ApplyResult {
  deltaEnergy: number;
  appliedMultiplier?: {
    value: number;
    durationMs: number;
  };
}

export interface StateSyncResponse {
  dayKey: string;
  totals: DayState["totals"];
  dailyGoal: DayState["dailyGoal"];
  activeMultiplier?: DayState["activeMultiplier"];
  userHasVoted: boolean;
  userContribution: number;
  leaderboard: LeaderboardEntry[];
  leaderboardTop: Array<{ display: string; score: number }>;
  top3Contributors: TopContributorDisplay[];
  rewardClaimed: boolean;
  rewardAvailable: boolean;
  canDemo: boolean;
  victory: {
    isComplete: boolean;
    justCompleted: boolean;
    completedAt?: number;
  };
  audit: AuditSyncData;
}

export interface AuditEvent {
  type: string;
  at: number;
  source?: string;
  deltaEnergy?: number;
  multiplier?: number | null;
  meta?: Record<string, unknown>;
}

export interface AuditSyncData {
  dayKey: string;
  lastPollAt: number | null;
  lastDeltaComments: number;
  lastDeltaUpvotes: number;
  lastDeltaDown: number;
  multiplierActive: boolean;
  multiplierValue: number | null;
  multiplierExpiresAt: number | null;
  last10Events: AuditEvent[];
  // Demo boost (mod-only, no rate limits)
  demoEnabled: boolean;
}
