# KarmaFoundry 🏭

A collaborative Reddit game where community participation powers a virtual factory.

**Built with Devvit 0.12 Web**

## Architecture

- **Devvit 0.12 Client/Server**: Modern web app with standard fetch API
- **GameMaker HTML5**: Factory animation in iframe
- **Backend**: Single fetch handler with KV storage
- **One post = One game instance** per subreddit

## Features

### Core Gameplay
- **Real-time Reddit activity tracking**: Polls post stats every 10s (comments, upvotes)
- **Heartbeat energy system**: +3 base energy per tick, multiplied by active boosts
- **Daily voting system**: Three multiplier options (1.5x, 2x, 3x) with varying durations
- **Downvote pressure**: Net downvotes reduce energy (-3 per downvote, up to 50/tick)
- **Victory condition**: Reach 10,000 energy to complete the day
- **Daily reset**: All progress resets at 00:00 UTC

### Technical Features
- **Live post stats**: `reddit.getPostById()` fetches real comment/score counts
- **Delta-based contributions**: Only new activity since last poll generates energy
- **Contribution caps**: 100 comments / 200 upvotes per 10s poll (anti-spam)
- **Cumulative audit tracking**: Δ Comments/Upvotes persist until reset
- **Leaderboard**: Top contributors ranked by energy contribution
- **Factory animation**: GameMaker HTML5 with postMessage bridge
- **Victory cinematic**: Screen shake + overlay + GameMaker trigger sequence
- **Mod-only demo mode**: Instant energy boost for testing (moderators only)

### UX & Design
- **Glass morphism UI**: CSS custom properties (`--kf-*` tokens)
- **Purple/teal gradient theme**: Consistent across all components
- **Responsive layout**: Works on mobile and desktop
- **Toast notifications**: Real-time feedback for boosts and penalties
- **Audit panel**: Dev transparency (polls, deltas, multipliers, events)

## Prerequisites

- Node.js 18+ and npm
- A Reddit account with permission to install apps on a test subreddit you moderate
- The Devvit CLI (installed as a dev dependency; run it with `npx devvit ...`). Sign in once with `npx devvit login`

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development (client)
```bash
npm run dev
```

Vite dev server starts at `http://localhost:3000`

### 3. Build
```bash
npm run build
```

### 4. Deploy
```bash
devvit upload
```

## Project Structure

```
karmafoundry/
  ├── src/
  │   ├── client/           # React app (Vite builds this)
  │   │   ├── main.tsx      # Entry point
  │   │   ├── AppShell.tsx  # Main component
  │   │   └── ui/           # UI components
  │   ├── shared/           # Constants shared by client and server
  │   └── server/           # Backend
  │       ├── index.ts      # fetch() handler (routes here)
  │       ├── kv/           # KV storage operations
  │       ├── reddit/       # Reddit API
  │       └── util/         # Helpers
  ├── public/               # Static assets
  │   └── gamemaker/        # GameMaker HTML5 export
  ├── devvit.json           # Devvit 0.12 config
  └── vite.config.ts        # Vite build config
```

## Configuration (`devvit.json`)

| Setting | Value | Meaning |
|---|---|---|
| `post.dir` | `dist/client` | Built React app shown inside the Reddit post (`tall` height) |
| `server.entry` | `index.cjs` | Bundled server handling `/api/*` routes |
| `menu` | "Create KarmaFoundry Post" | Moderator-only subreddit menu action that creates a new game post |
| `permissions` | `redis`, `reddit` | Lets the app store game state in Redis/KV and read post stats via the Reddit API |

Poll interval, contribution caps and the downvote penalty live in `src/shared/constants.ts`; the daily energy goal (10,000) is set in `src/server/kv/ops.ts`.

## Using it in a subreddit

1. Run `npm run build`, then `npm run upload` to push a version to Reddit.
2. Install the app on your test subreddit.
3. As a moderator, use the subreddit menu action **Create KarmaFoundry Post**.
4. Open the post and play. Use the mod-only demo boost (`POST /api/poll?demo=1`) to test victory without waiting for real activity.

## API Endpoints

All handled in `src/server/index.ts`:

- `GET /api/stateSync` - Full game state + audit data
  - Returns: totals, dailyGoal, multiplier, leaderboard, top3, victory, audit
  - Audit includes: lastPollAt, cumulative Δ comments/upvotes/downs, active multiplier
- `POST /api/poll` - Check for new Reddit activity
  - Fetches post stats via `reddit.getPostById(postId)`
  - Computes deltas vs cursor (new comments/upvotes since last poll)
  - Applies heartbeat (+3) + Reddit deltas × multiplier
  - Returns: boost (if energy gained), penalty (if downvotes), `_debug` payload
- `POST /api/poll?demo=1` - Demo boost (mod-only)
  - **Requires moderator permissions** — returns 403 `{ok:false, error:"DEMO_FORBIDDEN"}` if not mod
  - Instant +52 energy (42 base + 10 from simulated activity)
  - Bypasses post stats, awards 25 pts to user
  - Logs `DEMO_DENIED` audit event if unauthorized
- `POST /api/vote` - Cast daily vote (once per user per day)
  - Body: `{optionId: "boost" | "mega" | "steady"}`
  - Activates multiplier (1.5x-3x) for 30min-2hrs
  - Awards +5 energy + 50 pts to voter
- `POST /api/claim` - Claim victory reward
  - Only available when dailyGoal.achieved = true
  - Awards +200 pts to claimer
- `POST /api/admin/resetDay` - Reset day state (mod-only)
  - Clears energy, votes, cursor, leaderboard
  - Creates fresh day state with same dayKey

## GameMaker Integration

1. Export your GameMaker project as HTML5
2. Copy files to `public/gamemaker/`
3. Add bridge code (see placeholder HTML)
4. GameMaker loads at `/gamemaker/index.html`
5. Handle cinematic events: `CINEMATIC_START`, `CINEMATIC_VICTORY`, `CINEMATIC_END`

## Key Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Run Vite dev server |
| `npm run build` | Build client and server |
| `npm run build:client` | Build React app |
| `npm run build:server` | Build server bundle |
| `npm run upload` | `devvit upload` (alias) |
| `npm run publish` | `devvit publish` (alias) |
| `devvit upload` | Deploy to Devvit |
| `devvit publish` | Publish to production |

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
- [Devvit documentation](https://developers.reddit.com/docs) - platform reference (client/server web apps, Redis, Reddit API)

## Devvit 0.12 Benefits

- ✅ Standard client/server split
- ✅ Single fetch() handler for all routes
- ✅ Direct web app load (no "Play" button)
- ✅ Simpler configuration
- ✅ Better development experience

## Development Workflow

```bash
# Make changes to src/client/*
npm run dev          # Vite hot reload

# Make changes to src/server/*  
devvit upload        # Test on Reddit

# Ready to deploy
devvit publish
```

## Troubleshooting

**Client not loading?**
```bash
npm run build:client
```

**Routes not working?**
- Check `src/server/index.ts` fetch handler
- Verify route paths match client calls

**GameMaker not loading?**
- Ensure `public/gamemaker/index.html` exists
- Check path is `/gamemaker/index.html`

For platform-level problems see the [Devvit documentation](https://developers.reddit.com/docs).

## Ready to Deploy?

1. ✅ Run `npm install`
2. ✅ Test with `npm run dev`
3. ✅ Add GameMaker build to `public/gamemaker/`
4. ✅ Deploy with `devvit upload`

## License

MIT

---

## Terms

By using KarmaFoundry, you agree to the following:

- KarmaFoundry is a community game built on Reddit's Devvit platform.
- No data is stored outside of Reddit's built-in KV (key-value) storage.
- No personal data is exported, sold, or shared with third parties.
- No monetization or in-app purchases exist in this app.
- All game state (energy, votes, leaderboard) is scoped per subreddit and resets daily.
- Use of this app is subject to [Reddit's Terms of Service](https://www.redditinc.com/policies/user-agreement) and [Developer Terms](https://www.redditinc.com/policies/developer-terms).

## Privacy

**KarmaFoundry Privacy Policy**

KarmaFoundry does not collect, store, or export personal data externally.

- All game state is stored using Reddit's built-in KV storage, scoped per subreddit.
- User identifiers are hashed before storage — no usernames or account IDs are persisted in KV.
- No cookies, analytics, or third-party tracking services are used.
- No data is shared with external services.
- Display names shown on leaderboards are derived from Reddit usernames at the time of interaction and are not stored beyond the daily reset cycle.

For questions, contact the app developer via Reddit.
