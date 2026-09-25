# Railway Variables for the Bearproof Daily Bot

## Verified Build 3 daily policy

Use these values in the Telegram worker service’s **Railway Variables** tab to reproduce the tested policy. The best verified replay in the final-boss timing sweep on 2026-09-25’s Build 3 challenge (seed `3994460340`, `whale_season`, Chop Zone) scored **313,836**, survived for 19:57.28, defeated all four bosses, and reached level 36. The winning settings were repeated with the same score and replay hash. These values do not include secrets.

| Variable | Value |
| --- | --- |
| `BEARPROOF_URL` | `https://bearproof.app` |
| `BEARPROOF_BUILD` | `3` |
| `CHARACTER` | `bull` |
| `CHOICE_OVERRIDE` | `27:2,28:1,29:0` |
| `USE_PLANNER` | `1` |
| `PICKUP_RANGE_CAP` | `1` |
| `PICKUP_RANGE_BONUS` | `150` |
| `PICKUP_RANGE_EXCESS_PENALTY` | `1000` |
| `PICKUP_RANGE_UNTIL` | `360` |
| `XP_DECOY` | `1` |
| `XP_DECOY_CROWD` | `2` |
| `XP_DECOY_SECONDS` | `3` |
| `XP_DECOY_FORCE` | `0.025` |
| `XP_DECOY_MIN_HP` | `0.55` |
| `XP_RETURN_FORCE` | `0.045` |
| `DAILY_THREAT_RADIUS` | `70` |
| `DAILY_PROJECTILE_MULT` | `4.5` |
| `DAILY_DRIFT` | `0.0015` |
| `DAILY_XP_ATTRACTION` | `0.012` |
| `DAILY_XP_TARGET_RANGE` | `300` |
| `DAILY_XP_CROWD_LIMIT` | `0` |
| `LATE_SURVIVE_START` | `1160` |
| `LATE_THREAT_RADIUS` | `110` |
| `LATE_PROJECTILE_MULT` | `4.5` |
| `WEAPON_COOLDOWN_MULT` | `0.2` |
| `FIRE_RATE_HORNS` | `0.2` |
| `FIRE_RATE_LASER_EYES` | `0.2` |
| `FIRE_RATE_BUYBACK` | `0.2` |
| `FIRE_RATE_DEAD_CAT_BOUNCE` | `0.2` |
| `FIRE_RATE_AIRDROP` | `0.2` |
| `FIRE_RATE_GREEN_CANDLE` | `0.2` |
| `FINAL_BOSS_CHIP_START` | `1080` |
| `FINAL_BOSS_ENGAGE_AT` | `1180` |
| `FINAL_BOSS_LATEST_ENGAGE_AT` | `1198` |
| `FINAL_BOSS_HOLD_RANGE` | `850` |
| `FINAL_BOSS_KILL_WINDOW` | `30` |
| `FINAL_BOSS_INCOMING_FACTOR` | `0.8` |
| `FINAL_BOSS_DPS_FACTOR` | `0.55` |

Also set `TELEGRAM_BOT_TOKEN` to the bot’s BotFather token in Railway; it is a secret and must never be committed. The tested environment is date/seed-specific: the challenge seed and twist rotate. `run-today.mjs` fetches the active values dynamically, but the 311,000 score is verified only for this dated Build 3 challenge.

### Verified score breakdown

| Component | Points |
| --- | ---: |
| Time survived (1,197 full seconds × 10) | 11,970 |
| Ordinary enemy kills | 254,116 |
| Boss kills (five-times XP value) | 22,750 |
| Final-boss victory bonus | 25,000 |
| **Total** | **313,836** |

The run recorded 11,130 total kills, including four bosses, and first reached level 30 at 391.8 seconds. Its level-36 end build was Horns 5, Buyback 3, Airdrop 5, Dead Cat Bounce 3, Green Candle 1, and Diamond Hands 5; its passives were Conviction 2, Whale Gravity 1, DCA 3, Cold Wallet 2, Hedge 4, and Slippage 2. The milestone came from the stateful build planner plus a single early Whale Gravity pick and delaying the final-boss finish. The previous 197,675 baseline was 116,161 points lower (6,212 kills, level 37, four bosses, won at 13:38.2). Against the earlier 151,649 checkpoint, the verified result is +162,187 points and +5,488 kills, with four bosses rather than zero. Timing perturbations at 19:38 and 19:42 both retained four bosses and scores above 313,000; delaying the trigger to 19:44 missed the market-close cutoff, so keep the latest-start safeguard at 19:58.

## Why these values are not in `railway.json`

Railway’s Config as Code reference supports build and deploy settings in `railway.json`, but does not define service environment variables there. The reference also marks Config as Code deprecated in favor of Infrastructure as Code. Runtime values belong in the service’s Variables tab (or the supported Railway project/IaC configuration), not in an invented `deploy.variables` field. [Railway Config as Code reference](https://docs.railway.com/config-as-code/reference) · [Railway Variables guide](https://docs.railway.com/variables)

## Tunable environment variables and fallback defaults

The table below inventories the `process.env` tunables read by `run-bot.mjs`, `src/sim/bot.js`, and `src/sim/weapons.js`. “Daily Bull” and “Daily Pepe” identify profile-specific fallbacks; other values are literal code fallbacks. Dynamic per-weapon variables use the IDs listed at the bottom.

| Variable | Fallback | Used for |
| --- | --- | --- |
| `CHARACTER` | `bull` | Default playable character. |
| `CHOICE_OVERRIDE` | empty | Optional comma-separated `level:index` upgrade picks. |
| `DESIRED_SCORE` | `300000` | Local CLI benchmark status threshold. |
| `USE_PLANNER` | disabled | Enables planner upgrade choices only when `1`. |
| `PICKUP_RANGE_CAP` | `0` (no cap bonus) | Maximum Whale Gravity stacks receiving the early-priority bonus. |
| `PICKUP_RANGE_BONUS` | `45` | One-time planner/selector bonus while under the pickup cap. |
| `PICKUP_RANGE_EXCESS_PENALTY` | `1000` | Deprioritizes extra Whale Gravity stacks after the cap/window. |
| `PICKUP_RANGE_UNTIL` | `360` seconds | End of the early Whale Gravity preference window. |
| `ATTACK_BIAS` | `0` | Adds attack preference to selected late upgrade choices. |
| `ATTACK_BIAS_START` | `600` seconds | Start time for attack preference. |
| `ATTACK_BIAS_MIN_HP` | `0.62` | Minimum health ratio for attack preference. |
| `DEFENSE_BIAS` | `0` | Additional durability preference in Bull upgrade selection. |
| `PEPE_ATTACK_BIAS` | `ATTACK_BIAS`, else `0` | Pepe-specific offense preference. |
| `PEPE_ATTACK_START` | `ATTACK_BIAS_START`, else `600` seconds | Pepe offense start time. |
| `PEPE_ATTACK_MIN_HP` | `ATTACK_BIAS_MIN_HP`, else `0.7` | Pepe health gate for offense. |
| `PEPE_DEFENSE_BIAS` | `0` | Pepe-specific defense preference. |
| `PEPE_DEFENSE_UNTIL` | `600` seconds | End of Pepe early-defense preference window. |
| `DAILY_THREAT_RADIUS` | Bull `70`; Pepe `75` | Daily-profile enemy separation distance. |
| `DAILY_PROJECTILE_MULT` | Bull `4.5`; Pepe `2` | Daily-profile projectile evasion weight. |
| `LATE_SURVIVE_START` | infinity (disabled) | Time when late threat settings take over. |
| `LATE_THREAT_RADIUS` | Current daily threat radius | Late-game enemy separation distance. |
| `LATE_PROJECTILE_MULT` | Current daily projectile multiplier | Late-game projectile evasion weight. |
| `DAILY_DRIFT` | Bull `0.0015`; Pepe `0.003` | Daily-profile orbiting drift. |
| `DAILY_XP_ATTRACTION` | `0.012` | Daily XP attraction force. |
| `DAILY_XP_TARGET_RANGE` | `300` | Daily XP target search range. |
| `DAILY_XP_CROWD_LIMIT` | `0` | Maximum nearby enemy crowd before normal XP attraction pauses. |
| `XP_DECOY` | enabled unless `0` | Enables daily XP decoy/return movement. |
| `XP_DECOY_CROWD` | `5` | Minimum nearby enemy count to trigger an XP decoy. |
| `XP_DECOY_SECONDS` | `2.5` seconds | Decoy duration. |
| `XP_DECOY_MIN_HP` | `0.55` | Minimum health ratio to trigger a decoy. |
| `XP_DECOY_FORCE` | `0.025` | Decoy movement force. |
| `XP_RETURN_FORCE` | `0.045` | Final approach force when recovering XP. |
| `XP_POST_DROP` | enabled unless `0` | Enables post-drop XP targeting. |
| `XP_POST_DROP_START` | `300` seconds | Time post-drop targeting begins. |
| `BOSS_BUDGET_FACTOR` | `0.65` | Health reserve threshold for boss orbit behavior. |
| `BOSS_RANGE_FACTOR` | `0.72` | Boss orbit desired-range multiplier. |
| `BOSS_RANGE_CAP` | `260` | Maximum desired boss orbit range. |
| `BOSS_TANGENT` | `0.65` | Tangential boss orbit steering. |
| `BOSS_RADIAL_PULL` | `0.012` | Radial boss range correction. |
| `BOSS_FARM` | disabled unless `1` | Enables boss-farming steering. |
| `BOSS_FARM_WINDOWS` | empty (all times) | Optional comma-separated `start-end` time windows for boss farming. |
| `BOSS_FARM_MIN_HP` | `0.72` | Health ratio gate for boss farming. |
| `BOSS_FARM_RANGE` | `150` | Desired boss-farming distance. |
| `BOSS_FARM_TANGENT` | `0.45` | Tangential boss-farming steering. |
| `BOSS_FARM_PULL` | `0.02` | Radial boss-farming steering. |
| `BOSS_SOFT` | disabled unless `1` | Enables steering around non-final bosses. |
| `BOSS_SOFT_MIN_HP` | `0.75` | Health ratio gate for soft-boss steering. |
| `BOSS_SOFT_RANGE` | `180` | Desired soft-boss distance. |
| `BOSS_SOFT_PULL` | `0.003` | Soft-boss radial steering. |
| `FINAL_BOSS_CHIP_START` | `FINAL_BOSS_ENGAGE_AT - 70` | Start attacking the final boss during the chip window. |
| `FINAL_BOSS_ENGAGE_AT` | `0` (disabled) | Time, in seconds, when the bot resumes final-boss engagement. |
| `FINAL_BOSS_LATEST_ENGAGE_AT` | `1170` seconds | Latest time to override the safety gate and commit to the final fight. |
| `FINAL_BOSS_HOLD_RANGE` | `700` | Desired distance while holding the boss outside weapon range. |
| `FINAL_BOSS_KILL_WINDOW` | `30` seconds | Remaining boss HP budget, estimated from observed run DPS. |
| `FINAL_BOSS_MIN_REMAINING_HP` | `800` | Floor on the chip-and-hold HP threshold. |
| `FINAL_BOSS_DPS_FACTOR` | `0.55` | Conservative fraction of run DPS used for final-boss estimates. |
| `FINAL_BOSS_INCOMING_FACTOR` | `1.5` | Multiplier applied to observed incoming damage in the fight-safety estimate. |
| `FARM_AFTER_WIN` | disabled unless `1` | Enables post-win farming movement. |
| `FARM_ENEMY_WEIGHT` | `4` | Post-win normal-enemy steering weight. |
| `FARM_BOSS_WEIGHT` | `5` | Post-win boss steering weight. |
| `FARM_PROJECTILE_WEIGHT` | `5` | Post-win projectile-avoidance weight. |
| `WEAPON_COOLDOWN_MULT` | `1` | Global weapon cooldown multiplier; smaller values increase fire rate. |
| `WEAPON_SPREAD_MULT` | `1` | Default spread multiplier for weapons with multi-shot attacks. |
| `FIRE_RATE_<WEAPON_ID>` | `1` per weapon | Optional per-weapon cooldown multiplier, applied with the global multiplier. |
| `SPREAD_<WEAPON_ID>` | `WEAPON_SPREAD_MULT`, else `1` | Optional per-weapon spread multiplier. |

Per-weapon suffixes use the IDs from `src/sim/content.js`: `HORNS`, `GREEN_CANDLE`, `LASER_EYES`, `DIAMOND_HANDS`, `AIRDROP`, `LIMIT_ORDER`, `HOPIUM`, `CIRCUIT_BREAKER`, `BUYBACK`, `DEAD_CAT_BOUNCE`, and `TONGUE`.

## Daily benchmark

Run `npm run today` to fetch the current daily challenge and benchmark it with the tuned defaults. The command runs the policy twice, replays the generated run through the repository’s replay verifier, checks that the hashes and scores match, requires an end reason of `won` or `market_closed`, and fails if the score is below `MIN_DAILY_SCORE` (default `180000`).
