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
import { CAP_NET_DOWN, ENERGY_PENALTY_PER_DOWN } from "../shared/constants";

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
    const username = context.userName ?? (context as any).username;
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
      const displayName = context.userName
        ? `u/${context.userName}`
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

      const applyRes = await applyContributions(
        kv,
        subredditId,
        dayKey,
        cfg,
        [{ kind: "SYSTEM", count: 1, baseEnergyPerEvent: 10 }],
        { userHash: "system", display: "System" }
      );

      const boost =
        applyRes.deltaEnergy > 0
          ? {
              source: "SYSTEM",
              deltaEnergy: applyRes.deltaEnergy,
              multiplier: applyRes.appliedMultiplier?.value,
              multiplierDurationMs: applyRes.appliedMultiplier?.durationMs,
            }
          : undefined;

      // Record normal poll audit event
      if (boost) {
        await pushAuditEvent(kv, subredditId, dayKey, {
          type: "BOOST_APPLIED",
          source: "SYSTEM",
          deltaEnergy: boost.deltaEnergy,
          multiplier: boost.multiplier ?? null,
          at: Date.now(),
          meta: { reason: "Auto poll" },
        });
      }

      // ---- Downvote pressure ----
      // Use a simple simulated delta for now (real stats uses postStats)
      // The poll cursor tracks lastScore; negative delta = downvotes
      const { kPoll: kPollKey } = await import("./kv/keys");
      const pollKey = kPollKey(subredditId, dayKey);
      const cursor = (await kv.get(pollKey)) || { lastCommentCount: 0, lastScore: 0, lastDeltaDown: 0, updatedAt: 0 };

      // TODO: replace with actual post stats when available
      // For now we re-use the cursor; real flow would fetch reddit post score
      // deltaScore = currentScore - cursor.lastScore; deltaDown = max(0, -deltaScore)
      // Since we don't have live score yet, penalty only triggers from real score drops.
      // Stub: no penalty from auto-poll (only real stats flow)
      const deltaDown = 0;
      const cappedDown = Math.min(deltaDown, CAP_NET_DOWN);

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

        // Update cursor with downvote delta
        cursor.lastDeltaDown = cappedDown;
        await kv.set(pollKey, { ...cursor, updatedAt: Date.now() });

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
      const displayName = context.userName
        ? `u/${context.userName}`
        : `Player ${userHash.slice(0, 6)}`;

      await castVote(kv, subredditId, dayKey, userHash, body.optionId);

      const optionEnergy = 5;
      const display = context.userName ? `u/${context.userName}` : undefined;
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
      const displayName = context.userName
        ? `u/${context.userName}`
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
