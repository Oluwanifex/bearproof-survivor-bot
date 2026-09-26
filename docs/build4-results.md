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

This is the **best locally replay-verified score candidate** observed in the documented sweep. Liquidation at 41,030 ticks is below (not beyond) Build 4's 72,000-tick cap; no physics override was used. The result therefore complies with the local Build 4 simulation/tick-limit checks. The requested **250,000** score target was not reached, and Bearproof server-side acceptance has not been checked. No score was submitted.

A diagnostic replay showed the player at 107/108 HP around 11 minutes but accumulated contact damage as the enemy count rose (80 at 10 minutes, 86 at 11 minutes). The non-final Long Winter boss was nearly defeated at 11 minutes; liquidation followed at 11:23. This points to later crowd/contact pressure and lost uptime as the immediate bottleneck, not an expired tick cap.

## Selected comparable runs

All runs below used the same live Build 4 seed and twist, standard physics, legal replay inputs, and a locally verified replay. A liquidation before the cap is a normal Build 4 end state; scores are compared regardless of whether the run reached the market-close tick.

| Candidate | Score | Ticks | Bosses | End reason | Replay |
| --- | ---: | ---: | ---: | --- | --- |
| Pepe balanced + crate targeting | 109,948 | 37,265 | 2 | Liquidated | Verified |
| Pepe + soft boss steering, range 150 | 117,472 | 36,452 | 2 | Liquidated | Verified |
| Pepe + soft boss steering, range 220 | **134,020** | 41,030 | 3 | Liquidated | Verified |
| Pepe + soft boss steering, range 300 | 123,380 | 43,444 | 2 | Liquidated | Verified |
| Pepe + defense-weighted picks | 65,441 | 39,162 | 1 | Liquidated | Verified |
| Pepe + pure defensive picks | 37,954 | 43,227 | 1 | Liquidated | Verified |
| Pepe + high-firepower upgrade set | 55,118 | 23,973 | 1 | Liquidated | Verified |
| Pepe + periodic square-route movement | 27,071 | 72,000 | 0 | Market closed | Verified (`4369d6fd`) |

The movement-only orbit/constant-route experiments performed worse than contextual kiting. One periodic square-route replay did survive to the exact 72,000-tick cap (992 kills, level 11, hash `4369d6fd`), but scored only 27,071 and killed no bosses. Increasing passive defense alone extended some runs but reduced kill throughput; the tested upgrade target and steering values therefore do not establish a route to 250,000.

## Commands and status

- `npm run build` runs static checks and unit tests.
- `npm run tune:build4` sweeps the current challenge candidates; use `TUNE_ONLY=name1,name2` to rerun selected variants.
- `npm run today` refreshes the daily contract, refuses known physics/tick overrides, runs twice, verifies replay determinism and the exact stage/twist, and reports `rulesCompliant` separately from `targetReached`. It treats the verified 134,020 liquidation as an in-cap score candidate while correctly reporting that it is below 250,000. It does not check server-side acceptance.

A locally passing replay is not server acceptance. The 134,020 run is the current best local candidate under the normal Build 4 end/tick rules, not a 250,000-point result. Before any score is actually submitted, confirm the site accepts this Build 4 log format and exact challenge contract.
