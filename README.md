# Bearproof Survivor Bot

This project targets the **Bearproof Build #4** action-survival game at <https://bearproof.app/>. It is not a Pepe Escobar or Street/Drug Lord market bot.

The simulator mirrors the live Build 4 rules, including the opening wave, official weapons/entities, airdrop crates, and their loot. Runs use one legal movement code per 60-Hz tick, an available level-up card whenever the simulation pauses, and a replay log carrying the Build 4 simulation version. Build 4's 72,000-tick/20-minute cap and all official combat/weapon physics are unchanged. Movement and card priorities are controller policy, not game-balance overrides. Pepe starts with the character-exclusive Tongue Lash and has 90 HP with a 10% speed bonus.

## Validation

Run:

```bash
npm run build
npm run benchmark
npm run today
npm run tune:build4
```

`DESIRED_SCORE` is used only by the ordinary benchmark. `npm run today` fetches today's live contract, requires Build 4, refuses known physics/tick-cap overrides, runs twice, and checks replay hash/score determinism. Its default score target is 250,000; a lower result is reported honestly without treating a legal in-cap death as a simulation-rule violation. `npm run tune:build4` runs the deterministic per-seed strategy search and replay-checks its candidates. Local replay compliance is not a claim of server acceptance; any submission still needs the exact Bearproof build, seed, twist, character, and simulation version.

On 2026-09-26, the active Build #4 board was **Crypto Winter / Flash Crash**, seed `526031759`. The best locally replay-verified result now scores **210,732**, wins at 52,455 ticks, defeats four bosses, and repeats with replay hash `a02b2014`. It used one early Whale Gravity, two DCA, one Hedge, four evolved weapons, crate collection, and healing-aware retreat; the official 72,000-tick cap and all game physics remained unchanged. The requested **250,000** is still unachieved, and server-side acceptance has not been checked. See [Build 4 validation notes](docs/build4-results.md), [source provenance](docs/build4-sources.md), and the [current policy/deployment guardrails](docs/railway-variables.md). Build 3's 313,836 score is historical only and is not evidence for Build 4.

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
| `BEARPROOF_BUILD` | `4` | Build number sent to the Bearproof API; the runner checks the live daily board. |

`DESIRED_SCORE` is used only by the local benchmark command and is not needed for the Railway worker. The simulator and replay verifier enforce Build 4's fixed 72,000-tick (20-minute) cap. Do not set `MAX_TICKS`, `TELEGRAM_EXTENDED_TEST`, post-win farming, cooldown, fire-rate, or spread overrides. A run ends when the player dies, the final boss is defeated, or the market closes at the cap. Do not set `NODE_ENV` or `PORT` to make this service work; Node 22 is pinned in `package.json` and the worker uses Telegram long polling. After deploying, the Railway logs should show `Bearproof bot listening`. In Telegram, send `/start`, then `/Play <username> <Solana address> auto` to exercise the workflow. Do not create more than one production service with the same Telegram bot token, because Telegram polling allows only one active consumer for a bot token.

The Build 4 controller selects a character-legal daily policy by default. Any locally compliant score must still be checked against the site's current submission contract; local replay verification alone does not confirm server acceptance. Railway runtime variables belong in the Variables tab, not `railway.json`; see [current Build 4 settings and guardrails](docs/railway-variables.md).

## Telegram request format

The requested intake formats are:

```text
/Play <username> <address>
/Play <username> <address> auto
```

For Bearproof, `<address>` must be a **Solana public address** (base58, 32–44 characters). The username is the Bearproof board name. The bot should start a daily or free run, drive the simulation with the legal replay inputs, submit the verified claimed summary and encoded log to `/api/runs`, and associate the payout address through `/api/payout-address`. Never collect or transmit a private key or seed phrase.

During a manual Telegram run, the simulation pauses at every level-up and sends three inline buttons containing the available upgrade cards. Each card includes its level/evolution state and the concrete effect it provides, such as `Damage +10%`, `Attack speed +8%`, or `A five-beam fan with +10% crit`. The user selects one button; that exact card index is recorded in the deterministic replay, and the bot resumes. Adding the final `auto` argument selects every upgrade using the controller's high-score policy without waiting for Telegram input. `/status` reports the current score, kills, level, HP, mode, and whether an upgrade selection is pending. `/stop` cancels the run without submission.

## Server contract

The browser client uses these endpoints relative to the Bearproof origin:

- `POST /api/session` with `{ playerId, build, mode }`;
- `POST /api/player` with `{ playerId, name }`;
- `POST /api/payout-address` with `{ playerId, address }`;
- `POST /api/runs` with the build, seed, stage, claimed summary, duration, and base64url replay log.

Daily runs use the challenge seed and the deterministic twist returned by `GET /api/daily`; free runs are local/off-board unless the current challenge rules say otherwise. The supplied runner is intentionally headless and does not edit browser state or fabricate scores.
