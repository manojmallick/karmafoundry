# KarmaFoundry - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Reddit Post                          │
│                   (One per subreddit)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Devvit Web App                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            GameMaker HTML5 (iframe)                  │  │
│  │  • Factory animation                                 │  │
│  │  • Receives: STATE_SYNC, BOOST_APPLIED              │  │
│  │  • Receives: REWARD_CLAIMED, CINEMATIC_*            │  │
│  │  • Sends: READY                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │ postMessage                      │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           React Overlay (Transparent)                │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ TopBar: Twist + Multiplier                    │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ Middle: Energy Progress Bar                   │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ BottomActions: Vote | LB | Tutorial           │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ Modals: Vote | Leaderboard | Tutorial         │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ ToastStack: Boost notifications               │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ VictoryOverlay (cinematic)                    │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │           ▲
                       │           │
        ┌──────────────┘           └──────────────┐
        │                                          │
        ▼                                          │
┌──────────────┐                          ┌──────────────┐
│   Poller     │                          │  StateSync   │
│  (10s loop)  │                          │  (10s loop)  │
└──────┬───────┘                          └──────▲───────┘
       │                                         │
       │ POST /api/poll                         │ GET /api/stateSync
       │                                         │
       ▼                                         │
┌─────────────────────────────────────────────────────────────┐
│                    Devvit Backend                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  API Routes                          │  │
│  │  • GET  /api/stateSync  → Full state                │  │
│  │  • POST /api/poll       → Check contributions       │  │
│  │  • POST /api/vote       → Cast vote                 │  │
│  │  • POST /api/claim      → Claim reward              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  KV Operations                       │  │
│  │  • loadDayState()                                    │  │
│  │  • applyContributions()                             │  │
│  │  • castVote()                                        │  │
│  │  • claimDailyReward()                               │  │
│  │  • rolloverIfNeeded()                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   KV Store                           │  │
│  │  Keys:                                               │  │
│  │  • KF:v1:{sub}:{day}:state                          │  │
│  │  • KF:v1:{sub}:{day}:votes                          │  │
│  │  • KF:v1:{sub}:{day}:users                          │  │
│  │  • KF:v1:{sub}:{day}:lb                             │  │
│  │  • KF:v1:{sub}:{day}:poll (cursor)                  │  │
│  │  • KF:v1:{sub}:{day}:contrib:{userHash}             │  │
│  │  • KF:v1:{sub}:{day}:contributors                   │  │
│  │  • KF:v1:{sub}:{day}:top3                           │  │
│  │  • KF:v1:{sub}:{day}:completedAt                    │  │
│  │  • KF:v1:{sub}:{day}:completedNotified              │  │
│  │  • KF:v1:{sub}:config                               │  │
│  │  • KF:v1:{sub}:meta                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │           ▲
                       │           │
                       ▼           │
              ┌────────────────────────┐
              │   Reddit API           │
              │  getPostById()         │
              │  • commentCount        │
              │  • score (upvotes)     │
              └────────────────────────┘
```

## Data Flow

### 1. Contribution Detection (Polling)

```
Every 10 seconds:
  1. Frontend → POST /api/poll
  2. Backend → getPostStats(postId)
  3. Reddit API → returns {commentCount, score, ok: true}
  4. Backend → Load poll cursor from KV
     cursor = {
       lastCommentCount: 3,     // absolute count from last poll
       lastScore: 1,            // absolute score from last poll
       lastDeltaComments: 0,    // per-tick delta (not cumulative)
       lastDeltaUpvotes: 0,
       totalDeltaDown: 0,       // cumulative downvotes
       updatedAt: timestamp
     }
  5. Backend → Calculate per-tick deltas:
     deltaComments = max(0, newCount - cursor.lastCommentCount)
     deltaScore = newScore - cursor.lastScore
     deltaUpvotes = max(0, deltaScore)
     deltaDown = max(0, -deltaScore)
  6. Backend → Cap deltas (anti-spam):
     cappedComments = min(deltaComments, 100)
     cappedUpvotes = min(deltaUpvotes, 200)
     cappedDown = min(deltaDown, 50)
  7. Backend → Build contribution events:
     events = [
       { kind: "SYSTEM", count: 1, baseEnergyPerEvent: 3 },  // heartbeat
       { kind: "COMMENT", count: cappedComments, baseEnergyPerEvent: 2 },
       { kind: "UPVOTE", count: cappedUpvotes, baseEnergyPerEvent: 1 }
     ]
  8. Backend → applyContributions(events)
     - Loads day state, checks active multiplier
     - For each event: finalEnergy = baseEnergy × multiplier
     - Increments state.totals.energy, .comments, .upvotes
     - Records contribution for user (system)
  9. Backend → Handle downvote penalty (if deltaDown > 0):
     penaltyEnergy = cappedDown × 3
     applyPenalty() → reduces state.totals.energy
  10. Backend → Update poll cursor:
     cursor.lastCommentCount = newCount
     cursor.lastScore = newScore
     cursor.totalDeltaDown += cappedDown
     cursor.updatedAt = now
  11. Backend → Return boost + penalty + _debug
  12. Frontend → Show toast, send BOOST_APPLIED to GameMaker
```

### 2. State Synchronization

```
Every 10 seconds:
  1. Frontend → GET /api/stateSync
  2. Backend → rolloverIfNeeded() (checks if new day)
  3. Backend → loadDayState()
     state = {
       dayKey: "2026-02-12",
       totals: { energy: 817, comments: 4, upvotes: 0 },
       dailyGoal: { target: 10000, achieved: false, rewardState: "UNCLAIMED" },
       activeMultiplier?: { optionId, value: 3, expiresAt, durationMs }
     }
  4. Backend → loadVotes() + loadUsers()
  5. Backend → Load leaderboard (top 25)
  6. Backend → Load top3 contributors
  7. Backend → Load poll cursor for audit:
     audit = {
       dayKey,
       lastPollAt: cursor.updatedAt,
       lastDeltaComments: state.totals.comments,     // cumulative!
       lastDeltaUpvotes: state.totals.upvotes,        // cumulative!
       lastDeltaDown: cursor.totalDeltaDown,          // cumulative!
       multiplierActive: boolean,
       multiplierValue: number | null,
       multiplierExpiresAt: timestamp | null,
       last10Events: [ audit events ]
     }
  8. Backend → Check victory flags:
     - completedAt: timestamp when goal was reached (once per day)
     - justCompleted: true if this is first fetch since completion
  9. Backend → Return full state + audit
  10. Frontend → Update React state
  11. Frontend → Send STATE_SYNC to GameMaker
  12. GameMaker → Update factory visuals
  13. Frontend → Update audit panel (if open)
```

### 3. Victory Sequence

```
When energy crosses daily goal:
  1. Backend → set completedAt (once per day)
  2. Backend → stateSync returns victory.justCompleted = true
  3. Frontend → start cinematic timeline
     - 0ms: CINEMATIC_START + screen shake/flash
     - 600ms: CINEMATIC_VICTORY + VictoryOverlay
     - 5000ms: CINEMATIC_END + auto close
```

### 4. Voting Flow

```
User clicks Vote:
  1. Frontend → Show VotePanel
  2. User selects option
  3. Frontend → POST /api/vote {optionId}
  4. Backend → castVote()
  5. Backend → Apply multiplier if wins
  6. Backend → Update state
  7. Frontend → Show success toast
  8. Frontend → Refresh state
```

### 5. Daily Rollover

```
On any request:
  1. Backend → rolloverIfNeeded()
  2. Calculate current dayKey (YYYY-MM-DD)
  3. Compare with lastDayKey in meta
  4. If different:
     - Create new day state
     - Reset votes, users, cursor
     - Keep leaderboard for final day display
```

## Component Hierarchy

```
AppShell
├── CanvasStage (GameMaker iframe)
├── TopBar
│   ├── Title
│   ├── Multiplier Badge (conditional)
│   └── Twist Label (conditional)
├── Middle
│   └── Progress Bar
├── BottomActions
│   ├── Vote Button
│   ├── Leaderboard Button
│   └── Tutorial Button
├── VotePanel (modal)
│   └── Option Buttons[]
├── LeaderboardPanel (modal)
│   └── Entry List[]
├── TutorialModal
│   ├── Step 1-4
│   └── Navigation
├── RewardModal (conditional)
│   └── Claim Button
├── VictoryOverlay (conditional)
│   └── Top 3 + Claim CTA
└── ToastStack
    └── Toast[]
```

## Event Types

### React → GameMaker (postMessage)

```typescript
{
  type: "STATE_SYNC",
  payload: {
    dayKey: string,
    totals: { energy, comments, upvotes },
    dailyGoal: { target, achieved, rewardState },
    activeMultiplier?: { value, expiresAt },
    top3Contributors: Array<{ display, score }>,
    victory: { isComplete, justCompleted, completedAt? }
  }
}

{
  type: "BOOST_APPLIED",
  payload: {
    source: "UPVOTE" | "COMMENT" | "SYSTEM",
    deltaEnergy: number,
    multiplier?: number
  }
}

{
  type: "REWARD_CLAIMED",
  payload: {
    dayKey: string
  }
}

{
  type: "CINEMATIC_START"
}

{
  type: "CINEMATIC_VICTORY"
}

{
  type: "CINEMATIC_END"
}
```

### GameMaker → React (postMessage)

```typescript
{
  type: "READY"
}
```

## Timing Diagram

```
Time: 0s ────────────── 10s ────────────── 20s ──────────────
       │                 │                  │
Poll:  •─────────────────•──────────────────•─────────────→
       │                 │                  │
Sync:  •─────────────────•──────────────────•─────────────→
       │                 │                  │
User:     [votes]           [upvotes post]
       │     │             │     │          │
       ▼     ▼             ▼     ▼          ▼
Game:  [anim]             [boost anim]
```

## Security & Rate Limiting

```
┌─────────────────┐
│  Contribution   │
│    Capping      │
├─────────────────┤
│ Max 100 comments│  Prevents abuse
│ Max 200 upvotes │  per poll cycle
│ per 10s         │
└─────────────────┘

┌─────────────────┐
│   Backoff on    │
│  Rate Limit     │
├─────────────────┤
│ Detect 429      │  Exponential
│ Increase delay  │  backoff
│ Up to 60s       │
└─────────────────┘

┌─────────────────┐
│   User Hashing  │
├─────────────────┤
│ Hash userId     │  Privacy
│ Display hash    │  protection
│ No PII stored   │
└─────────────────┘
```

## Scaling Considerations

- **One post per subreddit** → Isolated KV stores
- **KV key namespacing** → No collisions
- **Daily rollover** → Bounded data growth
- **Leaderboard capped** → Top 100 users
- **Polling interval** → Tunable per load
- **Contribution caps** → Prevents spam impact

## Judge Demo Path (3 min)

```
1. [0:00] Show post → Animated factory visible immediately
2. [0:30] Click Vote → Show 3 options, cast vote
3. [1:00] Click "Simulate" → Instant toast + animation
4. [1:30] Show progress bar → Real numbers updating
5. [2:00] Click Leaderboard → Show contributors
6. [2:30] Click Tutorial → 4-step walkthrough
7. [3:00] Goal achieved → Reward modal appears
```
