# Emman Reading Room

A public-domain research library with an **Archival Research Curator** agent. One Express API (port 4100) serves a React web app (port 5173) and an Expo Android app. Both clients talk to the server **only over HTTP**.

- 282 public-domain works in six reading rooms (natural science, history and memoir, philosophy and politics, travel and exploration, essays and letters, scientific romance). No Shakespeare. Authors include Charles Darwin, Marie Curie, Nikola Tesla, Frederick Douglass, Ralph Waldo Emerson, Jules Verne, Mary Shelley and Theodore Roosevelt.
- Readers claim a **one-page bibliographic card PDF** (metadata and Project Gutenberg links, never book text).
- "My Shelf" and bookmarks are stored server-side and shared by web and phone.

## Test accounts

| Role   | Email                     | Password          |
| ------ | ------------------------- | ----------------- |
| Reader | `emman@emman.local`       | `Emman123!`       |
| Admin  | `emman.admin@emman.local` | `EmmanAdmin123!`  |

Both are pre-filled on the web sign-in page and the phone Account tab.

## Quick start

```bash
npm install
npm run db:reset      # wipes SQLite, runs Prisma migrations, seeds 282 works + the two accounts
npm run dev           # API on http://localhost:4100, web on http://localhost:5173
```

`npm run dev` needs ports 4100 and 5173 free (the web dev server uses `--strictPort`).

### Phone (Expo, Android)

```bash
cd phone
npm install
npm run start         # press "a" for an Android emulator, or scan the QR code with Expo Go
```

The emulator reaches your computer at `http://10.0.2.2:4100` (the default). On a real phone open the **Account** tab, set the server address to `http://<your-computer-LAN-IP>:4100` and save. You can also set `EXPO_PUBLIC_API_URL`.

## Layout

```
server/                      Express API + Prisma (SQLite)
  src/app.ts                 server bootstrap and middleware
  src/config/env.ts          environment variables and limits
  src/middleware/            authGuard.ts, allowanceGuard.ts
  src/services/              catalogService.ts, shelfService.ts, tokenService.ts, cardGenerator.ts
  src/http/                  session.ts, catalog.ts, loans.ts, shelves.ts, admin.ts, librarian.ts
  src/data/                  schema.prisma, client.ts, seed.ts, migrations/, catalog-seed/ (the 282 works)
  src/librarian/             persona, tool definitions, online loop, offline planner
  tests/rules.test.ts        end-to-end checks of the rules below
client/                      React + Vite web app
  src/features/              auth/, catalog/, shelf/, admin/, librarian/
  src/hooks/                 useCatalogSearch.ts, useUserShelf.ts, useLibrarianBot.ts
  src/shell/                 Header, AppFrame (layout), WorkCard (book card), LibrarianOverlay
phone/                       Expo React Native app
  src/navigation/            tab and stack navigation
  src/screens/               CatalogScreen, BookDetailScreen, ShelfScreen, AdminScreen, AccountScreen
  src/components/            BookTile, buttons, allowance strip, CuratorSheet (bottom sheet)
```

## Server-side rules

- **Guests**: at most **5 distinct titles**, tracked by IP address (`GuestRetrieval`).
- **Signed-in readers**: at most **10 distinct titles**, stored in the database (`Retrieval`).
- Re-downloading a title already claimed never counts toward the cap.
- `POST /api/loans/:workId/claim` enforces and records the cap, then returns a five-minute ticket for `GET /api/loans/card/:ticket`, which streams the one-page PDF.
- Shelf and bookmarks: `GET /api/shelves` returns one snapshot (entries, pins, revision); `PUT/DELETE /api/shelves/:workId`, `POST /api/shelves/:workId/pins`, `DELETE /api/shelves/pins/:pinId` change it.

Behind a reverse proxy set `TRUST_PROXY=true` so the guest IP comes from `X-Forwarded-For`.

## Archival Research Curator

Persona: *Archival Research Curator*. Tools: `find_titles`, `read_record`, `save_to_shelf`.

- `save_to_shelf` only **stages** a proposal. Nothing is written to the shelf until the client calls `POST /api/librarian/confirm` with the proposal id (`POST /api/librarian/dismiss` cancels).
- Comparison questions are forced through `find_titles` and then `read_record` (via `tool_choice` online, and by the planner offline).
- With `OPENAI_API_KEY` set in `server/.env` the online model drives the tools. Without it (or if the call fails) a rule-based offline planner answers using the same tools.

## Configuration

Copy `server/.env.example` to `server/.env` (created automatically by `npm run db:reset`). Variables: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`.

## Scripts

| Command             | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `npm run dev`       | API and web together                                               |
| `npm run db:reset`  | delete SQLite files, `prisma migrate deploy`, generate, seed       |
| `npm run typecheck` | TypeScript check for server and client                             |
| `npm test`          | server rule tests (uses a throwaway SQLite file)                   |
| `npm run dev:phone` | start the Expo dev server                                          |

Project Gutenberg ids in `catalog-seed/gutenbergIds.ts` were matched against the official catalogue with `server/scripts/resolveGutenbergIds.ts`. Titles without a confident match show a Gutenberg catalogue search link instead.

## Design system

Vellum background `#F7F4EB`, iron-gall ink `#181D24`, forest green `#1E5631` for filled buttons, active tabs and primary actions. Bordered secondary buttons, 8px controls, 12px cards. Serif type is used only for the library title and book titles; everything else is sans-serif.
