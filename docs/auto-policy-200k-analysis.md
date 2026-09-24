# Auto-Policy Optimization Analysis: Path to 200,000+

## Executive conclusion

The current automatic policy is not failing because of a small upgrade-weighting error. Its verified daily result is **161,718 points**, with **6,280 kills** and a complete 20-minute survival. The remaining gap to 200,000 is **38,282 points**. Because the run already reaches the 20-minute market close, additional survival time cannot provide those points. The next optimization must increase late-game kill throughput and secure the final-boss win bonus without reducing survival.

At the current run’s average enemy-score contribution, the gap represents approximately **1,600 additional kills**. Alternatively, killing the final boss would provide the fixed **25,000-point win bonus**, leaving approximately **13,282 points**, or roughly **560 additional average-value kills**, still required. The most promising work is therefore a **stateful combat policy**, not another global scalar reweighting of upgrade cards.

## Verified baseline

The active daily configuration is Bear Trap with the High Volatility twist and seed `4144142827`. The current tuned movement profile survives the full 20-minute limit. Its final build is:

| Measure | Result |
| --- | ---: |
| Score | 161,718 |
| Kills | 6,280 |
| Runtime | 1,200,000 ms |
| Level | 30 |
| Boss kills | 2 |
| End reason | `market_closed` |
| Win bonus | Not awarded |

The score model awards **10 points per second**, awards enemy experience as score on kills, multiplies boss score by five, and adds a **25,000-point bonus** only when the final boss is defeated. The fixed time component is therefore only 12,000 points. The baseline’s enemy and boss kills contribute approximately 149,718 points.

## What the searches established

Several deterministic searches were run against the same seed, twist, movement profile, and simulation. None produced a result higher than 161,718.

| Search family | Tested idea | Finding |
| --- | --- | --- |
| Defensive versus damage weights | Trade survivability for damage passives and weapons | Damage-heavy policies died earlier and scored less. |
| XP and pickup priorities | Prefer Compounding and Whale Gravity | No improvement over the baseline selector. |
| Weapon concentration | Increase existing-level and evolution bonuses; penalize new weapons | No improvement in the tested ranges. |
| Movement radius and projectile avoidance | Adjust threat radius, repulsion, projectile weights, XP attraction, and tangential drift | The stable full-duration local optimum remained the existing `r70 / projectile 3x` family. |
| Boss focus | Steer toward active bosses | Boss attraction reduced total performance or did not change the result. |
| Phase variations | Shift the deterministic drift phase | The phase-aligned daily path remained the best at 161,718. |

This evidence matters because it rules out the simplest intervention: changing a few constants in `chooseUpgrade`. The policy is interacting with deterministic card availability, XP pickup geometry, weapon range, enemy composition, and boss timing. A policy that looks stronger in isolation can produce fewer future level-ups or die before its damage matters.

## Primary bottleneck: damage is not being converted into late-game kills

The final baseline build reaches level 30 but does not have a concentrated evolved damage package. Its weapons are `Circuit Breaker` level 4, `Laser Eyes` level 3, `Buyback` level 5, `Airdrop` level 1, and `Diamond Hands` level 1, in addition to starter `Horns`. Its passive package is heavily defensive: `Hedge` and `Thick Skin` are both at five stacks, while `High Frequency` is only at one stack.

This build is durable enough to survive but not sufficiently optimized for clearing the maximum-enemy late-game field. The simulation allows six weapons and six passives, and a weapon evolves at level five. The current scalar selector treats an evolved card as only a modest bonus over ordinary card value. It therefore does not explicitly answer the more important question: **which weapon should be completed next, given the current enemy field and the time remaining before the next boss?**

The next policy should score an upgrade by its expected marginal kill rate, not by a static weapon or passive ranking. That estimate should include the weapon’s current level, cooldown, area, projectile count, piercing, evolution effect, and the current number and types of nearby enemies.

## Highest-value optimization priorities

### 1. Add a stateful build planner

The selector should maintain a target build plan for each run. The plan should reserve weapon slots for a small number of high-throughput weapons, prioritize completing one weapon to level five before spreading levels too widely, and stop taking defensive passives once the survival threshold is met.

A practical first planner would use three phases:

1. **Opening phase:** obtain two or three reliable damage sources and one survival passive.
2. **Scaling phase:** complete the strongest available weapon toward level five, while taking attack speed, damage, crit, or area upgrades when they provide more expected kills than another defensive stack.
3. **Boss phase:** prioritize evolved or boss-effective damage and healing. Defensive cards should be selected only when the current HP or incoming-damage estimate makes death likely before the next boss window.

This is different from simply increasing weapon weights. The planner must track whether an offered card advances a planned weapon to level five, fills an unused slot, or is a low-value diversion.

### 2. Optimize movement for kill density, not only survival

The current daily movement profile is a successful survival controller. It keeps the player near enough to farm XP while avoiding projectiles. Its failure mode is that the player spends too much of the late game outside the most productive weapon ranges.

Movement should become **phase-aware**. During normal waves it should collect XP and remain near the edge of the weapon envelope. When the player has strong area or piercing damage, it should deliberately pass through denser enemy lanes. When a boss is active, it should maintain the boss inside the effective range of the highest-value weapons instead of applying a uniform repulsion rule to all enemies.

The boss controller should not simply move toward a boss. The earlier boss-attraction search demonstrated that unconditional attraction is too dangerous. It should instead use a bounded target distance, evaluate nearby projectile trajectories, and switch to evasion when the predicted damage exceeds the player’s remaining health budget.

### 3. Add a boss damage budget and final-boss mode

The final boss is worth more than an ordinary enemy because its defeat both contributes boss score and ends the run with the 25,000-point bonus. The controller should begin a final-boss mode at or shortly before the final boss spawn time.

That mode should:

- identify the final boss separately from ordinary bosses;
- temporarily prefer damage, attack speed, crit, area, and boss-effective weapon evolutions;
- avoid spending an upgrade on a low-impact defensive card when current effective HP can survive the remaining boss window;
- maintain the final boss inside the effective range of piercing, aura, drain, or nova weapons;
- use the player’s remaining HP and damage-reduction stack to decide whether to attack or disengage.

The 25,000-point bonus makes this the most valuable single branch to test. Even a partial increase in kill rate during the final-boss window can close the remaining gap after the bonus is awarded.

### 4. Replace global scoring with short-horizon lookahead

The current simulation is deterministic. At a level-up, the bot can evaluate each candidate by cloning or snapshotting the simulation, applying the candidate, and simulating a bounded horizon. A horizon of 10–30 seconds is sufficient to estimate immediate damage, survival pressure, XP collection, and boss progress without requiring a full run for every choice.

The lookahead score should combine:

- enemy score and kills over the horizon;
- XP collected and projected level-up timing;
- damage dealt per second;
- damage taken and probability of liquidation;
- distance to the next boss and final-boss kill progress;
- an explicit penalty for occupying a weapon or passive slot with low future value.

Because the replay must remain deterministic, the lookahead must use cloned deterministic RNG state and must not consume randomness from the real run. This is an implementation constraint, not an optional detail.

### 5. Instrument the simulation before further tuning

The current summary reports score, kills, level, bosses, weapons, and passives, but it does not expose the information needed to explain why a candidate loses. Add diagnostic counters to local runs, without changing the verified replay format:

- score by 60-second interval;
- kills and damage by weapon;
- XP spawned, collected, and expired;
- time spent with enemies inside each weapon’s effective range;
- damage taken by source, including projectiles, collisions, and boss abilities;
- boss damage dealt and boss time-to-kill;
- level-up choices and the counterfactual score of each offered card.

These counters will distinguish the three likely failure modes: insufficient damage, missed XP causing under-leveling, and late-game movement that survives but prevents weapons from connecting.

## Recommended implementation sequence

The next implementation should not change the public Telegram command or replay submission format. It should proceed in the following order:

1. Add local-only combat telemetry and a per-interval score report.
2. Add a deterministic simulation snapshot or clone facility for bounded upgrade lookahead.
3. Implement a stateful build planner with weapon-slot reservations and capped defensive investment.
4. Add a bounded final-boss combat mode to movement.
5. Re-run the daily seed and a fixed regression set after each change.
6. Promote a change only if it improves both the daily score and the minimum score across the regression seeds, or if it increases daily score without materially reducing survival.

The 200,000 target should be treated as a measurable acceptance test. A candidate should be considered successful only when it produces at least 200,000 on the target seed, reaches the end or wins, and produces a replay that still verifies under the unchanged simulation contract.

## Important limitation

The current searches do not prove that 200,000 is reachable with the existing balance. They prove that simple global upgrade-weight changes, modest movement-radius changes, and unconditional boss attraction are insufficient. If stateful planning, boss-mode movement, and lookahead still fail to reach 200,000, the next question is whether the target requires a different daily seed, a different challenge twist, or a balance change in the simulation itself. Changing the simulation balance would invalidate existing replay compatibility and should not be done merely to make the target appear reachable.

## References

[1]: ../run-bot.mjs "Current deterministic runner and automatic upgrade policy"
[2]: ../src/sim/sim.js "Deterministic score accumulation, boss bonus, and run lifecycle"
[3]: ../src/sim/content.js "Simulation constants, weapons, waves, bosses, stages, and daily twists"
[4]: ../src/sim/entities.js "Player damage, defense, experience, and passive-effect mechanics"
[5]: ../src/sim/weapons.js "Weapon scaling, cooldowns, targeting, and evolution mechanics"
