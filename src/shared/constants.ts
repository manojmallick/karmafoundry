/** Single source of truth for KarmaFoundry configuration values */

// ---- Reset & Timing ----
export const RESET_TZ_LABEL = "00:00 UTC";
export const POLL_INTERVAL_SEC = 10;

// ---- KV ----
export const KV_PREFIX = "KF:v1";

// ---- Caps (per-poll contribution limits) ----
export const CAP_COMMENTS = 100;
export const CAP_UPVOTES = 200;
export const CAP_NET_DOWN = 50;

// ---- Downvote pressure ----
export const ENERGY_PENALTY_PER_DOWN = 3;

// ---- Demo ----
export const DEMO_LABEL = "DEMO MODE (mod-only)";
