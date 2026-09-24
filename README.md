# Bearproof Survivor Bot

This project targets the **Bearproof Build #2** action-survival game at <https://bearproof.app/b/2/>. It is not a Pepe Escobar or Street/Drug Lord market bot.

The controller uses Bearproof's public deterministic simulation contract: one legal movement code per 60-Hz tick, a level-up card index whenever the simulation pauses for an upgrade, and a binary replay log suitable for the site's `/api/runs` verifier. The movement policy kites nearby bears, avoids enemy projectiles, collects XP when safe, and keeps drifting instead of standing still. The upgrade policy prioritizes evolved weapons, Buyback/Diamond Hands/Laser Eyes/Circuit Breaker damage, then Thick Skin/Hedge/Cold Wallet/DCA/Slippage survivability; it takes a heal card when health is low.

## Validation

Run:

```bash
npm run build
npm run benchmark
```

`DESIRED_SCORE` defaults to `300000`. The benchmark prints the final score, kills, level, bosses, end reason, selected weapons/passives, replay size, and deterministic state hash. A submission is only valid when the replay is produced from the same Bearproof build, seed, twist, and simulation version used by the challenge.

The current Build #2 daily challenge tested here is **Bear Trap / High Volatility**, seed `4144142827`. The tuned daily movement profile keeps a wider projectile-avoidance radius and retained a verified **161,718**-point simulation run that reached the 20-minute market close; the standard free-run controller’s best retained baseline was **104,354**. The live verified board at the time of testing had a top score of **166,051**, so this project does not claim that 200,000 or 300,000 is consistently reachable on this build. The controller is optimized for legal replay behavior and should be re-benchmarked whenever the daily seed, twist, or build changes.

## Railway deployment

This repository deploys as a **Telegram long-polling worker**, not as an HTTP web server. Railway should deploy it as a single service from the repository root. The checked-in `railway.json` explicitly uses Railpack, runs `npm ci && npm run build` during the build, starts the worker with `npm start`, and restarts it after an unexpected exit. No public domain, `PORT`, or health-check path is required for the Telegram polling mode.

In the Railway service's **Variables** tab, add the following required variable:

| Variable | Required value |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | The token from BotFather for this bot. Keep it secret; do not commit it. |

The following variables are optional because the application has safe defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BEARPROOF_URL` | `https://bearproof.app` | Override the Bearproof API origin only for a compatible environment. |
| `BEARPROOF_BUILD` | `2` | Build number sent to the Bearproof API; keep `2` for the current project. |

`DESIRED_SCORE` is used only by the local benchmark command and is not needed for the Railway worker. Do not set `NODE_ENV` or `PORT` to make this service work; Node 22 is pinned in `package.json` and the worker uses Telegram long polling. After deploying, the Railway logs should show `Bearproof bot listening`. In Telegram, send `/start`, then `/Play <username> <Solana address>` to exercise the workflow. Do not create more than one production service with the same Telegram bot token, because Telegram polling allows only one active consumer for a bot token.

## Telegram request format

The requested intake format is:

```text
/Play <username> <address>
```

For Bearproof, `<address>` must be a **Solana public address** (base58, 32–44 characters). The username is the Bearproof board name. The bot should start a daily or free run, drive the simulation with the legal replay inputs, submit the verified claimed summary and encoded log to `/api/runs`, and associate the payout address through `/api/payout-address`. Never collect or transmit a private key or seed phrase.

During a Telegram run, the simulation pauses at every level-up and sends three inline buttons containing the available upgrade cards. The user selects one button; that exact card index is recorded in the deterministic replay, and the bot resumes. `/status` reports the current score, kills, level, HP, and whether an upgrade selection is pending. `/stop` cancels the run without submission.

## Server contract

The browser client uses these endpoints relative to the Bearproof origin:

- `POST /api/session` with `{ playerId, build, mode }`;
- `POST /api/player` with `{ playerId, name }`;
- `POST /api/payout-address` with `{ playerId, address }`;
- `POST /api/runs` with the build, seed, stage, claimed summary, duration, and base64url replay log.

Daily runs use the challenge seed and the deterministic twist returned by `GET /api/daily`; free runs are local/off-board unless the current challenge rules say otherwise. The supplied runner is intentionally headless and does not edit browser state or fabricate scores.
