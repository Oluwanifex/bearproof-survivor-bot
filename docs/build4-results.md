# Build 4 daily tuning results — 2026-09-26

## Live contract

`GET https://bearproof.app/api/daily` returned the following contract during tuning. Refresh it before any later run; this is a dated result.

| Field | Value |
| --- | --- |
| Date | `2026-09-26` |
| Build | `4` |
| Seed | `526031759` |
| Stage | Crypto Winter (`winter`) |
| Twist | Flash Crash (`flash_crash`) |
| Tick cap | 72,000 (20 minutes) |
| Simulation version | `4` |
| Build source commit | `1f68eabbc04bcf838277bc7a9122ac2a4e1274c9` |

Flash Crash doubles the bear spawn rate and halves enemy HP. Crypto Winter applies the official 0.9 player-speed multiplier, +20% enemy HP, and one point of unavoidable cold damage every ten seconds. No weapon cooldown/fire-rate, spread, movement-speed, enemy-stat, or tick-cap physics override was set during any run below.

## Best candidate observed

The highest score in the completed legal policy sweep was the `pepe-boss-soft-220` candidate. Its controller settings were Pepe, Build 4 card scoring, daily threat radius 70, projectile steering 4.5, drift 0.003, crate attraction 0.02, and non-final-boss steering enabled at range 220/pull 0.02. Those parameters affect only recorded legal movement choices and upgrade selection.

| Metric | Result |
| --- | ---: |
| Score | **134,020** |
| Ticks / time | 41,030 / 11:23.83 |
| End reason | **Liquidated** |
| Kills / bosses | 4,935 / 3 |
| Level | 33 |
| Crates collected | 11 |
| Survival points | 6,830 |
| Ordinary kill points | 113,940 |
| Boss points | 13,250 |
| Final-boss win bonus | 0 |
| Replay bytes | 38,541 |
| Local replay hash | `8e8adb99` |
| Local replay verifier | Passed; replay score/hash matched |

This is a locally verified simulation result, **not** a successful competition submission: it ended by liquidation well before the cap and did not earn the final-boss bonus. The requested **250,000** target was not reached. No score was submitted to Bearproof.

A diagnostic replay showed the player at 107/108 HP around 11 minutes but accumulated contact damage as the enemy count rose (80 at 10 minutes, 86 at 11 minutes). The non-final Long Winter boss was nearly defeated at 11 minutes; liquidation followed at 11:23. This points to later crowd/contact pressure and lost uptime as the immediate bottleneck, not an expired tick cap.

## Selected comparable runs

All candidates below used the same live Build 4 seed and twist, standard physics, legal replay inputs, and a local replay verification. Early exits are shown as research results only; none is a submission candidate.

| Candidate | Score | Ticks | Bosses | End reason | Replay |
| --- | ---: | ---: | ---: | --- | --- |
| Pepe balanced + crate targeting | 109,948 | 37,265 | 2 | Liquidated | Verified |
| Pepe + soft boss steering, range 150 | 117,472 | 36,452 | 2 | Liquidated | Verified |
| Pepe + soft boss steering, range 220 | **134,020** | 41,030 | 3 | Liquidated | Verified |
| Pepe + soft boss steering, range 300 | 123,380 | 43,444 | 2 | Liquidated | Verified |
| Pepe + defense-weighted picks | 65,441 | 39,162 | 1 | Liquidated | Verified |
| Pepe + pure defensive picks | 37,954 | 43,227 | 1 | Liquidated | Verified |
| Pepe + high-firepower upgrade set | 55,118 | 23,973 | 1 | Liquidated | Verified |

The movement-only orbit/constant-route experiments performed worse than contextual kiting. Increasing passive defense alone extended some runs but reduced kill throughput; the tested upgrade target and steering values therefore do not establish a route to 250,000.

## Commands and status

- `npm run build` runs static checks and unit tests.
- `npm run tune:build4` sweeps the current challenge candidates; use `TUNE_ONLY=name1,name2` to rerun selected variants.
- `npm run today` refreshes the daily contract, refuses known physics/tick overrides, runs twice, verifies replay determinism, and requires a won or market-closed run at or above 250,000 by default. On the documented seed it should fail rather than mislabel the early-death 134,020 result as a competition candidate.

A locally passing replay is not server acceptance. Before submitting any later run, require a full-cap or win result, matching Build 4 replay verification, matching score/hash on repeat, and confirmation that the site still accepts this Build 4 log format.
