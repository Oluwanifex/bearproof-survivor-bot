# Railway variables and Build 4 guardrails

## Build 4 status (2026-09-26)

The current board was Build 4, seed `526031759`, Crypto Winter / Flash Crash. The best locally replay-verified result scored **210,732**, won at 52,455 ticks, and repeated with the same hash (`a02b2014`) under normal physics. The 250,000 target remains **unachieved**, and server-side acceptance has not been checked. No Railway variables were changed and no score was sent to Bearproof.

Build 3 values from 2026-09-25 are historical only. **Do not copy cooldown/fire-rate/spread values from Build 3**: physics overrides are explicitly forbidden in the Build 4 benchmark and no longer affect the authoritative copied Build 4 weapon module.

## Runtime variables

`TELEGRAM_BOT_TOKEN` is the only required secret. Add it in Railway's private Variables UI and never commit it. The application defaults `BEARPROOF_BUILD` to `4` and validates it against the live daily board before a run.

The source now defaults to the *best locally verified winning Build 4 policy* below. This is not evidence of server acceptance or target attainment:

| Variable | Value | Purpose |
| --- | --- | --- |
| `BEARPROOF_URL` | `https://bearproof.app` | Official API origin. |
| `BEARPROOF_BUILD` | `4` | Client build sent to Bearproof; daily board mismatch aborts safely. |
| `DAILY_POLICY` | `build4` | Selects the legal Build 4 upgrade scorer for auto mode. |
| `CHARACTER` | `pepe` | Character tested in the best observed candidate. |
| `DAILY_THREAT_RADIUS` | `70` | Controller separation distance; movement policy only. |
| `DAILY_PROJECTILE_MULT` | `4.5` | Controller projectile avoidance; movement policy only. |
| `DAILY_DRIFT` | `0.003` | Controller drift; movement policy only. |
| `CRATE_ATTRACTION` | `0.02` | Controller attraction to nearby official crates; movement policy only. |
| `BOSS_SOFT` | `1` | Enables non-final-boss steering; movement policy only. |
| `BOSS_SOFT_RANGE` | `220` | Controller steering range; movement policy only. |
| `BOSS_SOFT_PULL` | `0.02` | Controller radial steering; movement policy only. |
| `BOSS_BUDGET_FACTOR` | `0.35` | Controller's final-boss attack health budget; policy only. |
| `HEAL_RETREAT` | `1` | Enables movement retreat when health is low; policy only. |
| `HEAL_RETREAT_START` | `0.55` | Start retreat below 55% health; policy only. |
| `HEAL_RETREAT_EXIT` | `0.86` | End retreat after health recovers above 86%; policy only. |
| `XP_DECOY` | `0` | Disables the tested decoy/return behavior, which did not improve this seed. |
| `MIN_DAILY_SCORE` | `250000` | Local `npm run today` threshold; not needed in Telegram runtime. |

Do not configure `WEAPON_COOLDOWN_MULT`, `FIRE_RATE_*`, `SPREAD_*`, speed multipliers, `MAX_TICKS`, test-only extended duration, or post-win farming. The authoritative simulation and replay verifier retain the 72,000-tick/20-minute Build 4 limit and official game physics. These controls either fail the local guard or must not be used to pursue a challenge score.

## Checks before deployment or submission

From the project root:

```bash
npm ci
npm run build
npm run today
```

`npm run today` fetches the current contract, requires Build 4, runs the seeded replay twice, checks score/hash determinism, validates stage/twist and the 72,000-tick maximum, then reports rule compliance separately from the 250,000 default score target. A normal in-cap liquidation can still be a valid score candidate when its replay verifies. On the documented 2026-09-26 challenge, the standard runner reports `rulesCompliant: true` and `targetReached: false` for the deterministic 210,732 win (`a02b2014`). The script does not submit a score or check server-side acceptance.

`npm run tune:build4` searches policies and replay-checks all candidates, including normal early endings. To qualify as a local Build 4 score candidate, a run must use the current exact challenge contract, legal inputs/upgrades, standard physics, remain at or below the cap, and reproduce/verify the same score and hash. Whether a given result is accepted by the site is a separate server-side question.

Railway runs a single Telegram long-polling worker; keep the token private and do not scale to multiple consumers. The source defaults to Build 4, but an explicitly configured stale `BEARPROOF_BUILD=3` will make the worker reject today's Build 4 board until that variable is updated. Railway runtime variables belong in the Variables UI; `railway.json` is not the place for them.

## Historical Build 3 reference

On 2026-09-25 only, a Build 3 run for seed `3994460340` / Whale Season / Chop Zone scored 313,836 and won at 71,837 ticks. That used a different simulator and challenge contract. Its seed-specific timing, choice indices, and nonstandard cooldown settings are archived here as history only; they are not applicable to Build 4.
