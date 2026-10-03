# CIRCUS LUNGJUN BETA — Full Web Game

A self-hosted real-time multiplayer card game implementation based on the supplied CIRCUS LUNGJUN BETA rules/reference. The reference artwork is treated as design guidance only; this project uses original CSS/card rendering and no copied commercial assets.

## Included

- Real Node.js web server + Socket.IO realtime multiplayer
- SQLite persistence for accounts, rooms, chat, games, seasons, league stats and match history
- Account registration/login with bcrypt password hashing + JWT session
- Profile/avatar/display name + league points + wins + match history
- CREATE ROOM / JOIN ROOM with 6-character codes
- SIMPLE / LEAGUE rooms, host controls, ready state, kick, room settings
- Real-time room/game chat with server-side rate limit
- Server-authoritative game state and action validation
- 112-card deck validation
- FIRST TURN / INSERT WINDOW / LAST DANCE / CIRCUS / RESET +2 ALL
- DOUBLE, TRIPLE, DRAW FOUR, BACKWORD, SKIP, JOKER, JOKER BACKWORD, JOKER x2
- Disconnect pause + persistent state + resume only when all players are back
- League seasons of 100 recorded games, automatic season close and champion storage
- Responsive desktop/mobile UI
- Local browser sound effects + mute persistence
- No Skull system

## Run locally

Requires Node.js 20+.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

For LAN play, start the server on a computer reachable by the other players and open its LAN address, for example `http://192.168.1.20:3000`.

## Public deployment

The chat session cannot create a permanent public Internet URL for you. Deploy this Node service to a VPS/container host with HTTPS/WSS, set a strong `JWT_SECRET`, use persistent storage for `data/circus.sqlite`, and place a reverse proxy in front of Node.

## Important rule boundary

The specification defines that a turn timer is configurable but does not define what a timeout should do. Therefore this build stores and displays the timer setting but does not invent a timeout penalty/action.

## Tests

Run the dependency-free rule tests with:

```bash
npm test
```

`npm test` is configured in package.json and covers deck size, deal/start, INSERT gating, stacking, RESET +2 ALL, CIRCUS punishment and basic scoring.


## Render deployment (mobile-safe)
This project is intentionally pinned to Node 22 (`.node-version` and `package.json`). The repository root must contain `server/index.js` and `package.json`; do not upload the project as a nested `circus-lungjun-beta/circus-lungjun-beta` directory.

Render Build Command: `npm install`
Render Start Command: `npm start`
Environment variable (optional but recommended): `NODE_VERSION=22.23.3`

The `1V1` room mode forces exactly 2 players.
