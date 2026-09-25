# Bearproof Survivor Bot

This project targets the **Bearproof Build #3** action-survival game at <https://bearproof.app/>. It is not a Pepe Escobar or Street/Drug Lord market bot.

The controller uses Build 3's deterministic simulation contract: one legal movement code per 60-Hz tick, a level-up card index whenever the simulation pauses for an upgrade, a character byte for Bull or Pepe, and a binary replay log suitable for the site's `/api/runs` verifier. Pepe starts with the character-exclusive Tongue Lash and 90 HP but moves 10% faster; the optimized daily controller prioritizes early durability, then evolved weapons, XP recovery, and projectile-safe kiting.

## Validation

Run:

```bash
npm run build
npm run benchmark
npm run today
```

`DESIRED_SCORE` defaults to `300000`. The ordinary benchmark prints the final score, kills, level, bosses, end reason, selected weapons/passives, replay size, and deterministic state hash. `npm run today` fetches the live daily challenge, runs and replays it twice, verifies the deterministic hash, and fails unless it reaches the configured minimum score with a valid win or market-close result. `npm run profile:daily` replays the recorded final-boss timing and planner robustness variants for the 2026-09-25 seed. A submission is only valid when the replay is produced from the same Bearproof build, seed, twist, character, and simulation version used by the challenge.

On 2026-09-25, the live Build #3 daily challenge was **Chop Zone / Whale Season**, seed `3994460340`. The best tested planner profile scores **313,836**, records **11,130 kills**, defeats all four bosses, reaches level 36, and wins at 71,837 ticks (19:57.28). Its replay hash is `e748758a`; two identical runs matched. A pair of ±2-second timing perturbations also cleared 313k; a 19:44 trigger missed the 20-minute close, so preserve the tested 19:58 latest-start safeguard. The stateful build planner, one early Whale Gravity stack, and delayed damage-budgeted final-boss engagement were the main improvements over the 197,675-point baseline. This benchmark is seed-specific; daily seeds and twists rotate, so rerun `npm run today` against the live challenge rather than relying on this dated result. See the [score and upgrade breakdown](docs/railway-variables.md#verified-build-3-daily-policy) for the exact result.

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
| `BEARPROOF_BUILD` | `3` | Build number sent to the Bearproof API; the current daily board is Build 3. |

`DESIRED_SCORE` is used only by the local benchmark command and is not needed for the Railway worker. The simulator and replay verifier enforce the build's fixed 72,000-tick (20-minute) cap; there is no extended tick-cap variable. A run ends when the player dies, the final boss is defeated, or the market closes at the cap. Do not set `MAX_TICKS`, `TELEGRAM_EXTENDED_TEST`, or post-win farm variables. Do not set `NODE_ENV` or `PORT` to make this service work; Node 22 is pinned in `package.json` and the worker uses Telegram long polling. After deploying, the Railway logs should show `Bearproof bot listening`. In Telegram, send `/start`, then `/Play <username> <Solana address> auto` to exercise the workflow. Do not create more than one production service with the same Telegram bot token, because Telegram polling allows only one active consumer for a bot token.

Set the tested daily-policy variables in Railway’s Variables tab; Railway’s `railway.json` Config as Code format does not configure runtime service variables. See [the complete variable inventory and tuned profile](docs/railway-variables.md) before deploying.

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
