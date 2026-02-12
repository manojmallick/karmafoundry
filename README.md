# KarmaFoundry 🏭

A collaborative Reddit game where community participation powers a virtual factory.

**Built with Devvit 0.12 Web**

## Architecture

- **Devvit 0.12 Client/Server**: Modern web app with standard fetch API
- **GameMaker HTML5**: Factory animation in iframe
- **Backend**: Single fetch handler with KV storage
- **One post = One game instance** per subreddit

## Features

- Real-time community contributions (upvotes, comments)
- Daily voting twist system with multipliers
- Leaderboard and top contributors
- Factory animation powered by GameMaker
- Victory cinematic (shake + overlay + GameMaker trigger)
- Mobile-responsive design

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

## API Endpoints

All handled in `src/server/index.ts`:

- `GET /api/stateSync` - Full game state
- `POST /api/poll` - Check for new contributions
- `POST /api/vote` - Cast daily vote
- `POST /api/claim` - Claim rewards

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
| `devvit upload` | Deploy to Devvit |
| `devvit publish` | Publish to production |

## Documentation

- **[DEVVIT_012_MIGRATION.md](DEVVIT_012_MIGRATION.md)** - Migration guide (read this!)
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Development guide
- **[DEMO.md](DEMO.md)** - Demo script
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture

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

See [DEVVIT_012_MIGRATION.md](DEVVIT_012_MIGRATION.md) for detailed troubleshooting.

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
