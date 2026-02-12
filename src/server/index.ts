import { createServer, context, getServerPort } from "@devvit/server";
import { reddit } from "@devvit/reddit";
import { kv } from "./util/kv-redis";
import {
  getStateSync,
  rolloverIfNeeded,
  applyContributions,
  castVote,
  claimDailyReward,
  loadConfig,
  applyDemoBoost,
  pushAuditEvent,
  addUserPoints,
  resetDayState,
  applyPenalty,
} from "./kv/ops";
import { CAP_NET_DOWN, ENERGY_PENALTY_PER_DOWN, CAP_COMMENTS, CAP_UPVOTES } from "../shared/constants";
import { getPostStats } from "./reddit/postStats";

// ---- Helpers ----

function hashUserId(userId: string): string {
  if (!userId || userId === "anon") return "anon";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 16);
}

async function isCurrentUserMod(): Promise<boolean> {
  try {
    const username = context.username ?? (context as any).username;
    if (!username) return false;
    const mods = reddit.getModerators({
      subredditName: context.subredditName,
    });
    // Iterate moderators and check for a match — username filter is unreliable
    const target = username.toLowerCase();
    for await (const mod of mods) {
      if (mod.username?.toLowerCase() === target) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error("[KF] Mod check failed:", e);
    return false;
  }
}

function sendJson(res: any, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendError(res: any, message: string, status = 400) {
  sendJson(res, { ok: false, error: message }, status);
}

/** Read JSON body from IncomingMessage */
function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: any) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

// ---- Server ----

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";
  const key = `${method.toUpperCase()} ${url.pathname}`;

  console.log(`[KF] ${key}`);

  try {
    // ---- MENU ACTIONS ----
    if (key === "POST /internal/menu/post-create") {
      console.log("[KF] Creating custom post...");
      console.log("[KF] subredditName:", context.subredditName);

      const post = await reddit.submitCustomPost({
        subredditName: context.subredditName,
        title: "KarmaFoundry — Daily Forge",
        entry: "default",
      });

      console.log("[KF] Created post:", post.id);
      sendJson(res, { ok: true, postId: post.id });
      return;
    }

    // ---- API ROUTES ----
    const subredditId = context.subredditId ?? "unknown_sub";
    const postId = context.postId ?? "unknown_post";
    const userId = context.userId ?? "anon";
    const userHash = hashUserId(userId);

    if (key === "GET /api/stateSync") {
      const data = await getStateSync(kv, subredditId, userHash);
      const canDemo = await isCurrentUserMod();
      sendJson(res, { ...data, canDemo });
      return;
    }

    if (key === "POST /api/admin/resetDay") {
      const isMod = await isCurrentUserMod();
      const { dayKey } = await rolloverIfNeeded(kv, subredditId);

      if (!isMod) {
        await pushAuditEvent(kv, subredditId, dayKey, {
          type: "ADMIN_DENIED",
          source: userHash,
          at: Date.now(),
          meta: { action: "resetDay" },
        });
        sendError(res, "Forbidden: moderator-only action", 403);
        return;
      }

      const result = await resetDayState(kv, subredditId, dayKey, userHash);
      sendJson(res, result);
      return;
    }

    if (key === "POST /api/poll") {
      const demo = url.searchParams.get("demo") === "1";
      const cfg = await loadConfig(kv, subredditId);
      const { dayKey } = await rolloverIfNeeded(kv, subredditId);
      const displayName = context.username
        ? `u/${context.username}`
        : `Player ${userHash.slice(0, 6)}`;

      if (demo) {
        const applyRes = await applyDemoBoost(kv, subredditId, dayKey, cfg);

        await addUserPoints(
          kv,
          subredditId,
          dayKey,
          userHash,
          displayName,
          25
        );

        await pushAuditEvent(kv, subredditId, dayKey, {
          type: "BOOST_APPLIED",
          source: "SYSTEM",
          deltaEnergy: applyRes.deltaEnergy,
          multiplier: applyRes.appliedMultiplier?.value ?? null,
          at: Date.now(),
          meta: { reason: "Demo boost" },
        });

        sendJson(res, {
          ok: true,
          demo: true,
          boost: {
            source: "SYSTEM",
            deltaEnergy: applyRes.deltaEnergy,
            multiplier: applyRes.appliedMultiplier?.value,
            multiplierDurationMs: applyRes.appliedMultiplier?.durationMs,
            reason: "Demo boost",
          },
          rateLimited: false,
        });
        return;
      }

      // ---- Fetch real Reddit post stats ----
      if (postId === "unknown_post") {
        console.warn("[KF] Poll: no postId available, skipping stats fetch");
        sendJson(res, { ok: true, boost: undefined, penalty: undefined, rateLimited: false });
        return;
      }

      const stats = await getPostStats(postId);
      console.log(`[KF] Poll stats for ${postId}: comments=${stats.commentCount}, score=${stats.score}`);
      const { kPoll: kPollKey } = await import("./kv/keys");
      const pollKey = kPollKey(subredditId, dayKey);
      const cursor = (await kv.get(pollKey)) || {
        lastCommentCount: 0,
        lastScore: 0,
        lastDeltaComments: 0,
        lastDeltaUpvotes: 0,
        lastDeltaDown: 0,
        updatedAt: 0,
      };
      console.log(`[KF] Poll cursor: lastComments=${cursor.lastCommentCount}, lastScore=${cursor.lastScore}`);

      // Compute deltas
      const rawDeltaComments = Math.max(0, stats.commentCount - cursor.lastCommentCount);
      const rawDeltaScore = stats.score - cursor.lastScore;
      const deltaUpvotes = Math.max(0, rawDeltaScore);
      const deltaDown = Math.max(0, -rawDeltaScore);

      // Cap per-poll deltas
      const cappedComments = Math.min(rawDeltaComments, CAP_COMMENTS);
      const cappedUpvotes = Math.min(deltaUpvotes, CAP_UPVOTES);
      const cappedDown = Math.min(deltaDown, CAP_NET_DOWN);

      console.log(`[KF] Poll deltas: comments=${cappedComments}, upvotes=${cappedUpvotes}, down=${cappedDown}`);

      // Build contribution events from real stats
      const events: { kind: "COMMENT" | "UPVOTE" | "SYSTEM"; count: number; baseEnergyPerEvent: number }[] = [];
      if (cappedComments > 0) {
        events.push({ kind: "COMMENT", count: cappedComments, baseEnergyPerEvent: 2 });
      }
      if (cappedUpvotes > 0) {
        events.push({ kind: "UPVOTE", count: cappedUpvotes, baseEnergyPerEvent: 1 });
      }

      let boost: any = undefined;
      let applyRes: any = { deltaEnergy: 0 };

      if (events.length > 0) {
        applyRes = await applyContributions(
          kv,
          subredditId,
          dayKey,
          cfg,
          events,
          { userHash: "system", display: "System" }
        );
        console.log(`[KF] Poll applied: deltaEnergy=${applyRes.deltaEnergy}, multiplier=${applyRes.appliedMultiplier?.value ?? 1}`);

        if (applyRes.deltaEnergy > 0) {
          boost = {
            source: "SYSTEM",
            deltaEnergy: applyRes.deltaEnergy,
            multiplier: applyRes.appliedMultiplier?.value,
            multiplierDurationMs: applyRes.appliedMultiplier?.durationMs,
          };

          await pushAuditEvent(kv, subredditId, dayKey, {
            type: "BOOST_APPLIED",
            source: "SYSTEM",
            deltaEnergy: boost.deltaEnergy,
            multiplier: boost.multiplier ?? null,
            at: Date.now(),
            meta: {
              reason: "Reddit activity",
              deltaComments: cappedComments,
              deltaUpvotes: cappedUpvotes,
            },
          });
        }
      }

      // Update poll cursor with current values
      await kv.set(pollKey, {
        lastCommentCount: stats.commentCount,
        lastScore: stats.score,
        lastDeltaComments: cappedComments,
        lastDeltaUpvotes: cappedUpvotes,
        lastDeltaDown: cappedDown,
        updatedAt: Date.now(),
      });

      let penalty: any = undefined;
      if (cappedDown > 0) {
        const penaltyEnergy = cappedDown * ENERGY_PENALTY_PER_DOWN;
        const penaltyResult = await applyPenalty(kv, subredditId, dayKey, {
          deltaEnergy: penaltyEnergy,
          reason: "Downvote pressure",
        });

        await pushAuditEvent(kv, subredditId, dayKey, {
          type: "DOWNVOTE_PRESSURE",
          source: "SYSTEM",
          deltaEnergy: -penaltyResult.deltaEnergyApplied,
          at: Date.now(),
          meta: { cappedDown, deltaEnergyApplied: penaltyResult.deltaEnergyApplied },
        });

        penalty = {
          reason: "Downvote pressure",
          cappedDown,
          deltaEnergyApplied: penaltyResult.deltaEnergyApplied,
        };
      }

      sendJson(res, { ok: true, boost, penalty, rateLimited: false });
      return;
    }

    if (key === "POST /api/vote") {
      const body = await readBody(req);
      if (!body?.optionId) {
        sendError(res, "Missing optionId");
        return;
      }

      const cfg = await loadConfig(kv, subredditId);
      const { dayKey } = await rolloverIfNeeded(kv, subredditId);
      const displayName = context.username
        ? `u/${context.username}`
        : `Player ${userHash.slice(0, 6)}`;

      await castVote(kv, subredditId, dayKey, userHash, body.optionId);

      const optionEnergy = 5;
      const display = context.username ? `u/${context.username}` : undefined;
      await applyContributions(
        kv,
        subredditId,
        dayKey,
        cfg,
        [{ kind: "SYSTEM", count: 1, baseEnergyPerEvent: optionEnergy }],
        { userHash, display }
      );

      await addUserPoints(
        kv,
        subredditId,
        dayKey,
        userHash,
        displayName,
        50
      );
      sendJson(res, { ok: true, dayKey, userHasVoted: true });
      return;
    }

    if (key === "POST /api/claim") {
      const { dayKey } = await rolloverIfNeeded(kv, subredditId);
      const displayName = context.username
        ? `u/${context.username}`
        : `Player ${userHash.slice(0, 6)}`;

      const before = await getStateSync(kv, subredditId, userHash);
      await claimDailyReward(kv, subredditId, dayKey);
      const after = await getStateSync(kv, subredditId, userHash);

      if (!before.rewardClaimed && after.rewardClaimed) {
        await addUserPoints(
          kv,
          subredditId,
          dayKey,
          userHash,
          displayName,
          200
        );
      }
      sendJson(res, { ok: true, state: after });
      return;
    }

    // 404
    res.writeHead(404);
    res.end("Not found");
  } catch (error: any) {
    console.error("[KF] Server error:", error?.stack ?? error);
    sendError(res, error?.message ?? String(error), 500);
  }
});

server.listen(getServerPort());
console.log("[KF] Server started on port", getServerPort());
