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
