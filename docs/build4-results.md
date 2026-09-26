# Build 4 daily tuning results — 2026-09-26

## Live contract

`GET https://bearproof.app/api/daily` returned this contract during tuning. Refresh it before any later run; this is a dated result.

| Field | Value |
| --- | --- |
| Date | `2026-09-26` |
| Build | `4` |
| Seed | `526031759` |
| Stage | Crypto Winter (`winter`) |
| Twist | Flash Crash (`flash_crash`) |
| Tick cap | 72,000 ticks / 20 minutes |
| Simulation version | `4` |
| Build source commit | `1f68eabbc04bcf838277bc7a9122ac2a4e1274c9` |

Flash Crash doubles bear spawn rate and halves enemy HP. Crypto Winter applies the official 0.9 player-speed multiplier, +20% enemy HP, and one unavoidable cold damage every ten seconds. All reported candidates used **normal Build 4 physics**: no weapon cooldown/fire-rate, spread, player/enemy speed/stat, spawn, XP, or tick-cap overrides.

## Best verified candidate

The best current candidate is `pepe-retreat55-boss35` with the standard Build 4 legal upgrade scorer. Movement choices use Pepe, threat radius 70, projectile steering 4.5, drift 0.003, crate attraction 0.02, and soft stage-boss steering (range 220, pull 0.02). It retreats below 55% HP and resumes normal operation above 86%; it uses a 0.35 player-health boss-engagement budget. These are controller decisions only, not physics changes.

| Metric | Result |
| --- | ---: |
| Score | **210,732** |
| Score target | 250,000 — **not reached** |
| Gap to target | 39,268 |
| Ticks / elapsed time | 52,455 / 874.250 seconds (14:34.250) |
| End reason | **Won** |
| Kills / bosses | 6,655 / 4 |
| Level | 34 |
| Survival points | 8,740 |
| Ordinary kill points | 153,742 |
| Boss points | 23,250 |
| Final-boss win bonus | 25,000 |
| Official supply crates collected | 12 |
| Crate loot | 4 shields, 5 printers, 3 magnets |
| Evolved weapons | Tongue Lash, Laser Eyes, Buyback, Diamond Hands |
| Passives | High Frequency 2, Whale Gravity 1, Thick Skin 2, DCA 2, Hedge 1, Slippage 1 |
| Replay bytes | 57,116 |
| Replay hash | `a02b2014` |
| Replay verifier | Passed; replay score/hash matched |
| Repeated run | Same score/hash; deterministic |

The 210,732 result improves the prior 134,020 in-cap candidate by 76,712 points. The official cap is a maximum, not a minimum: winning at 52,455 ticks is within the 72,000-tick rule. The replay is locally verified and rules-compliant; **Bearproof server-side acceptance has not been checked**, and no score was submitted from this simulator task.

## User-proposed tactics tested

- **Airdrop crates:** the best run collected 12 official crates, including shield, printer, and magnet effects. Crate seeking stays a movement preference; the game’s crate drops and effects are unchanged.
- **Whale Gravity:** the best build took it once, adding +30% pickup range. Repeatedly forcing it was not better.
- **Decoy and return for XP:** decoy/return experiments did not improve the winning score. The winning controller disabled the decoy (`XP_DECOY=0`); its diagnostics show no decoy or return starts.
- **Healing retreat / DCA:** the 55% retreat policy was selected. The winning build had DCA 2 (1 HP/s total regeneration), plus Hedge 1 (8% damage reduction).
- **Attack and weapon growth:** the build ended with High Frequency 2 (8% per stack) and four weapon evolutions. Conviction and Leverage were not part of the best build. A Leverage-after-Hedge strategy scored 106,564 and liquidated early.
- **Extra XP pull:** stronger XP attraction (up to 0.06 versus the ordinary 0.012 fallback) caused earlier deaths; it did not improve score.

## Nearby experiments and tradeoffs

| Candidate/experiment | Score | Ticks | Bosses | Outcome | Finding |
| --- | ---: | ---: | ---: | --- | --- |
| Best policy, auto engage with 0.35 health budget | **210,732** | 52,455 | 4 | Won | Best verified score; hash `a02b2014` |
| Delay final-boss engagement to 19:00–19:30 | 207,892 | 61,034 | 3 | Liquidated | More ordinary kill points, but lost the final-boss kill and 25,000-point win bonus |
| Earlier policy, soft boss steering at range 220 | 134,020 | 41,030 | 3 | Liquidated | Prior best before boss-budget/retreat tuning |
| Bull character with otherwise matching strategy | 43,947 | 22,294 | 1 | Liquidated | Pepe was substantially better on this seed |
| Decoy/return, extra XP pull, and forced evolution/combat builds | Below 110,000 in tested runs | Varied | Varied | Mostly liquidated | Did not beat the best combined strategy |
| Periodic square-route movement | 27,071 | 72,000 | 0 | Market closed | Survived to the full cap but had very low scoring throughput |

The best score remains **39,268 below 250,000**. This search does not prove the target impossible; it shows the current tested legal strategies have not reached it. The higher-scoring delayed-boss run illustrates the tradeoff: kill farming increased, but the final win bonus was lost.

## Runner and verification

- `npm run build` runs static checks and unit tests.
- `npm run tune:build4` runs the strategy tuner against the live Build 4 contract and replay-checks each candidate. `TUNE_ONLY=name1,name2` reruns selected variants.
- `npm run today` refreshes the daily contract, refuses known physics/tick overrides, runs twice, checks hash/score reproducibility, validates the replay/stage/twist, and reports `rulesCompliant` separately from `targetReached`.
- `npm run today` does **not** submit a score or check server-side acceptance.

For a later date, treat this as historical data and rerun only after confirming the live build, seed, stage, and twist. See [Build 4 source provenance](build4-sources.md) and [runtime guardrails](railway-variables.md).