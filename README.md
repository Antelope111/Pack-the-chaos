# Play Lab · Pack the Chaos

Four H5 games, including 84 packing puzzles across seven chapters, 28 rotating Daily layouts, theme victory cards, and an optional shared club leaderboard.

## Source

- `public/`: original standalone games and assets; `public/games/packing/` contains the packing UI.
- `app/api/community/[...path]/route.ts`, `lib/community-server.ts`: authenticated nickname claims and progress sync.
- `db/schema.ts`, `drizzle/`: D1 schema and immutable schema-only migrations.
- `scripts/generate-packing-catalog.mjs`: regenerate the server's level/revision/scoring catalog after editing puzzles.
- `scripts/vite/playlab-pages.ts`: serves the same HTML through the retained game URLs.

Anonymous play remains local. Joining explicitly publishes a nickname and aggregate progress. Names are globally unique within this Site, with NFKC normalization, collapsed spaces and case-insensitive comparison. Ownership uses a random HttpOnly cookie; only its hash is stored. The current version has no account recovery, renaming or cross-device save restoration. The leaderboard imports local records and is intended for playtesting, not cheat-resistant competition.

## Local development

Use Node.js >=22.13 and install from the committed lockfile:

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_colorful_frog_thor.sql
npm start -- --port 8765
```

Apply each migration once to a new local database. `npm run dev` starts source development on port 5173 with the same local D1 state. Keep `.wrangler/`, `.sites-runtime/`, and local credentials out of source packages. To play offline, open `public/index.html`; the club needs the server.

When changing puzzle data, run `node scripts/generate-packing-catalog.mjs` before building. When changing schema, run `npm run db:generate`, review the SQL, and append migrations; never edit already-applied migration history.

## Hosting

`.openai/hosting.json` retains the existing Sites project identity and declares `DB` as the D1 binding. The official Sites build creates the Worker and static assets under `dist/`, including migrations. Sites provisions the hosted database and applies migrations during publication. Local test accounts are never part of the deployment archive.

The source uses the official Vinext/Sites starter integrations. See [Cloudflare static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) for the folder-index URLs retained by the games.

Travel achievements: `public/games/packing/achievements.js` derives 18 milestone
badges plus monthly completion badges from current-revision best results. The
calendar supports past daily puzzles; streaks count consecutive completed puzzle
dates, including catch-up, rather than login activity. Today's unfinished puzzle
keeps yesterday's streak active until the next UTC midnight. Best-streak badges
remain earned after a break. Replays never increase distinct-date counts.
The authenticated, read-only `/api/community/achievements` endpoint returns only
the current member's score dates/revisions/stars; visitors use local progress.
No database migration or separate badge counters are required.
