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

The current Build #2 daily challenge tested here was **Bear Trap / High Volatility**, seed `4144142827`. The best retained controller run scored **81,638**; a bounded movement search produced a lower **77,306** candidate and was not promoted. The live verified board at the time of testing had a top score of **166,051**, so this project does not claim that 300,000 is consistently reachable on this build. The controller is optimized for legal replay behavior and should be re-benchmarked whenever the daily seed, twist, or build changes.

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

## Local target-score guard

`userscripts/bearproof-target-score-guard.user.js` is a Tampermonkey helper for Build #2 development builds. It matches `https://bearproof.app/b/2/*` (plus the equivalent `www`, localhost, and `127.0.0.1` development routes), provides a target-score field, keeps the simulation alive while the score is below that target, and automatically restores ordinary death behavior as soon as the target is reached. Press **Stop** to restore ordinary behavior manually.

The script requires the page to expose the `window.__bearproof` debug hook, including a completed replay export (`exportRun()`, `exportReplay()`, `getReplay()`, or an equivalent replay field). It must not be used to alter a ranked run. The guard changes only local player invulnerability; it does not change score, kills, or the replay log, so a guarded run is for development/testing rather than leaderboard submission.

To use it, install the userscript in Tampermonkey, open Build #2, enter a board name, enter the desired score, and click **Start guard**. After the run ends, click **Submit run** to register the session/player and POST the claimed summary plus base64url replay log to `/api/runs`. The last target and player name are saved in browser local storage.
