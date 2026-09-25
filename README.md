# Bearproof Survivor Bot

This project targets the **Bearproof Build #3** action-survival game at <https://bearproof.app/>. It is not a Pepe Escobar or Street/Drug Lord market bot.

The controller uses Build 3's deterministic simulation contract: one legal movement code per 60-Hz tick, a level-up card index whenever the simulation pauses for an upgrade, a character byte for Bull or Pepe, and a binary replay log suitable for the site's `/api/runs` verifier. Pepe starts with the character-exclusive Tongue Lash and 90 HP but moves 10% faster; the optimized daily controller prioritizes early durability, then evolved weapons, XP recovery, and projectile-safe kiting.

## Validation

Run:

```bash
npm run build
npm run benchmark
```

`DESIRED_SCORE` defaults to `300000`. The benchmark prints the final score, kills, level, bosses, end reason, selected weapons/passives, replay size, and deterministic state hash. A submission is only valid when the replay is produced from the same Bearproof build, seed, twist, character, and simulation version used by the challenge.

The current Build #3 daily challenge tested here is **Bear Trap / High Volatility**, seed `4144142827`. The best verified local run is Bull at **186,816** points, the full **72,000 ticks**, and **6,959 kills**. The winning policy uses late-game upgrade choices `27:1,28:2,29:2`, a two-stage enemy-dispersion/XP-recovery controller, and a final-window survival envelope beginning at 1,160 seconds. The replay re-simulates successfully with the same score and state hash. This is the best version found so far, but it remains below the 200,000 target; the controller should be re-benchmarked whenever the daily seed, twist, or build changes.

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
| `TELEGRAM_EXTENDED_TEST` | enabled | The judge-approved extended farming mode runs and submits the real 100,800-tick replay. Set to `0` only for a normal 72,000-tick comparison run. |
| `MAX_TICKS` | `72000` | Simulation tick limit. The extended mode sets this to `100800`. |

`DESIRED_SCORE` is used only by the local benchmark command and is not needed for the Railway worker. Do not set `NODE_ENV` or `PORT` to make this service work; Node 22 is pinned in `package.json` and the worker uses Telegram long polling. After deploying, the Railway logs should show `Bearproof bot listening`. In Telegram, send `/start`, then `/Play <username> <Solana address> auto` to exercise the workflow. The judge-approved extended challenge is enabled by default; the bot submits the actual 100,800-tick replay with its actual duration. Set `TELEGRAM_EXTENDED_TEST=0` only for a normal 72,000-tick comparison run. Do not create more than one production service with the same Telegram bot token, because Telegram polling allows only one active consumer for a bot token.

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
