# Build 4 result: 331,118 points

## Outcome

Across staged sweeps, **11,884 candidate runs** of legal strategy variants were evaluated on the 2026-09-26 Build 4 daily contract. They found a score of **331,118**, exceeding the 322,000 goal by 9,118 points. The run won by defeating all four bosses at tick 70,708 (1,178.47 seconds). This is a local simulator result for one dated challenge, not a guarantee for later daily seeds or a claim of server acceptance.

| Metric | Result |
| --- | ---: |
| Build / challenge | Build 4, Crypto Winter / Flash Crash |
| Date / seed | 2026-09-26 / `526031759` |
| Character / upgrade profile | Pepe / `combat` |
| Score | **331,118** |
| Score breakdown | 11,780 survival + 271,088 ordinary kills + 23,250 boss kills + 25,000 final-boss win |
| Bosses defeated | **4** |
| Ticks / final-boss kill | 70,708 / 1,178.47 seconds |
| Replay/state hash | `135ecf39` |
| XP decoy diagnostics | 28 decoy starts, 27 returns, 21 return pickups, 4 target orbs expired |

The replay was independently rerun from the exact challenge and strategy settings. Its score, boss count, tick count, and state hash matched the search candidate; the recorded run-log replay also passed.

## Winning strategy settings

The daily runner automatically applies this preset **only** when the live date, build, stage, seed, and twist all exactly match the challenge above. Override specific values through the environment as usual, or disable automatic preset selection with `BUILD4_TARGET_PRESET=0`. Other daily challenges continue to use the standard policy defaults.

```text
DAILY_POLICY=build4
CHARACTER=pepe
BUILD4_UPGRADE_PROFILE=combat
DAILY_THREAT_RADIUS=35
DAILY_PROJECTILE_MULT=0.75
DAILY_DRIFT=0.003
DAILY_XP_ATTRACTION=0.012
DAILY_XP_CROWD_LIMIT=1
DAILY_XP_TARGET_RANGE=420
CRATE_ATTRACTION=0.012
CRATE_MAX_CROWD=4
BOSS_SOFT=1
BOSS_SOFT_RANGE=260
BOSS_SOFT_PULL=0.02
BOSS_BUDGET_FACTOR=0.55
BOSS_FARM=0
BOSS_FARM_BLEND=1
BOSS_FARM_MIN_HP=0.45
BOSS_FARM_PULL=0.06
BOSS_FARM_RANGE=100
BOSS_FARM_TANGENT=0.65
HEAL_RETREAT=0
HEAL_RETREAT_START=0.4
HEAL_RETREAT_EXIT=0.98
XP_DECOY=1
XP_DECOY_CROWD=0
XP_DECOY_SECONDS=1.5
XP_DECOY_FORCE=0.04
XP_RETURN_FORCE=0.09
XP_DECOY_MIN_DISTANCE=240
XP_DECOY_MIN_HP=0.55
XP_DECOY_COOLDOWN=10
XP_DECOY_AWAY_WEIGHT=1.5
XP_DECOY_THREAT_WEIGHT=1
XP_POST_DROP_START=600
FINAL_BOSS_ATTACK_BLEND=1
FINAL_BOSS_CHIP_START=970
FINAL_BOSS_ENGAGE_AT=1060
FINAL_BOSS_LATEST_ENGAGE_AT=1060
FINAL_BOSS_HOLD_BLEND=0
FINAL_BOSS_HOLD_RANGE=450
FINAL_BOSS_KILL_WINDOW=55
```

## Reproduce and validate

```bash
npm ci
npm run build
npm run today
```

`npm run today` fetches the daily contract, applies the preset only on an exact match, runs twice, checks the replay and deterministic hash, and reports `targetReached`. It does **not** submit a score. The simulator's official Build 4 physics and 72,000-tick cap are unchanged. For search methodology and additional tuning switches, see the root [README](../README.md).
