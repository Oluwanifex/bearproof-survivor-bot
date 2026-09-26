/**
 * @module sim/bot
 * @description A small autopilot that plays the game from simulation state. Used by the HQ attract mode
 * (the live preview) and by tests that need long, realistic runs. It returns move codes like a real
 * player's input. It is NOT part of the simulation: its output is recorded, so its own determinism
 * doesn't matter for replays.
 */

import { encodeMove } from './input-codes.js';

export function createBot({ style = 'survive', phase = 0 } = {}) {
    let t = phase;
    let xpRecovery = null;
    let nextDecoyAt = 0;
    let healthRetreat = false;
    const diagnostics = { retreatStarts: 0, retreatTicks: 0, decoyStarts: 0, returnStarts: 0, returnTicks: 0, decoyCollected: 0, returnCollected: 0, targetExpired: 0 };
    return {
        /** Move code for this tick. */
        move(sim) {
            t++;
            const p = sim.player;
            let fx = 0;
            let fy = 0;
            if (style === 'daily' && process.env.HEAL_RETREAT === '1' && p._sum('hpRegen') > 0) {
                const hpRatio = p.hp / Math.max(1, p.maxHp);
                const retreatAt = Number(process.env.HEAL_RETREAT_START || 0.35);
                const returnAt = Number(process.env.HEAL_RETREAT_EXIT || 0.72);
                if (!healthRetreat && hpRatio <= retreatAt) {
                    healthRetreat = true;
                    diagnostics.retreatStarts++;
                }
                else if (healthRetreat && hpRatio >= returnAt) healthRetreat = false;
                if (healthRetreat) {
                    diagnostics.retreatTicks++;
                    for (const e of sim.enemies) {
                        const dx = p.x - e.x;
                        const dy = p.y - e.y;
                        const d2 = dx * dx + dy * dy;
                        const keep = (e.boss ? 250 : 200) + e.size;
                        if (d2 > keep * keep) continue;
                        const w = (e.boss ? 5 : 2) / (d2 + 40);
                        fx += dx * w;
                        fy += dy * w;
                    }
                    for (const b of sim.enemyProjectiles) {
                        const dx = p.x - b.x;
                        const dy = p.y - b.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < 180 * 180) {
                            fx += dx / (d2 + 30) * 6;
                            fy += dy / (d2 + 30) * 6;
                        }
                    }
                    const len = Math.hypot(fx, fy);
                    if (len > 1e-6) return encodeMove(fx / len, fy / len);
                    const nearestThreat = nearest(sim.enemies, p);
                    if (nearestThreat) {
                        fx = p.x - nearestThreat.x;
                        fy = p.y - nearestThreat.y;
                        const away = Math.hypot(fx, fy) || 1;
                        return encodeMove(fx / away, fy / away);
                    }
                    return 0;
                }
            }
            const finalBoss = sim.enemies.find((e) => e.boss && e.def.final && e.hp > 0);
            const bossBudgetFactor = Number(process.env.BOSS_BUDGET_FACTOR || 0.65);
            const bossBudget = p.maxHp * bossBudgetFactor + p.getDamageReduction() * p.maxHp;
            const finalBossEngageAt = Number(process.env.FINAL_BOSS_ENGAGE_AT || 0);
            const delayedBossMode = finalBossEngageAt > 0;
            const chipStartAt = Number(process.env.FINAL_BOSS_CHIP_START || Math.max(0, finalBossEngageAt - 70));
            const latestEngageAt = Number(process.env.FINAL_BOSS_LATEST_ENGAGE_AT || 1170);
            const averageRunDps = sim.stats.damageDealt / Math.max(60, sim.time);
            const estimatedBossDps = averageRunDps * Number(process.env.FINAL_BOSS_DPS_FACTOR || 0.55);
            const killWindowSeconds = Number(process.env.FINAL_BOSS_KILL_WINDOW || 30);
            const chipThreshold = finalBoss
                ? Math.min(finalBoss.maxHp - 1, Math.max(Number(process.env.FINAL_BOSS_MIN_REMAINING_HP || 800), estimatedBossDps * killWindowSeconds))
                : 0;
            const chippedBossHold = !!finalBoss && delayedBossMode
                && sim.time >= chipStartAt && sim.time < finalBossEngageAt
                && finalBoss.hp <= chipThreshold;
            const safeBossBudget = finalBoss && finalBossDamageBudget(sim, finalBoss);
            const chipAttack = !!finalBoss && delayedBossMode && sim.time >= chipStartAt
                && sim.time < finalBossEngageAt && !chippedBossHold && p.hp > bossBudget;
            const scheduledBossAttack = !!finalBoss && delayedBossMode && sim.time >= finalBossEngageAt
                && (safeBossBudget || sim.time >= latestEngageAt);
            const holdBossForLater = !!finalBoss && delayedBossMode && (
                sim.time < chipStartAt || chippedBossHold
                || (sim.time >= finalBossEngageAt && !scheduledBossAttack)
            );
            if (holdBossForLater) {
                const dx = finalBoss.x - p.x;
                const dy = finalBoss.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                const holdRange = Math.max(
                    Number(process.env.FINAL_BOSS_HOLD_RANGE || 700),
                    effectiveBossRange(sim) + finalBoss.size + 100
                );
                const radial = (d - holdRange) * Number(process.env.FINAL_BOSS_HOLD_PULL || 0.1);
                const tangent = ((t % 2) ? 1 : -1) * Number(process.env.FINAL_BOSS_HOLD_TANGENT || 0.18);
                fx += (dx / d) * radial - (dy / d) * tangent;
                fy += (dy / d) * radial + (dx / d) * tangent;
                const threatRadius = Number(process.env.DAILY_THREAT_RADIUS || 70);
                for (const e of sim.enemies) {
                    if (e === finalBoss) continue;
                    const ex = p.x - e.x;
                    const ey = p.y - e.y;
                    const d2 = ex * ex + ey * ey;
                    const keep = (e.boss ? 150 : threatRadius) + e.size;
                    if (d2 > keep * keep) continue;
                    const w = (e.boss ? 3 : 1) / (d2 + 40);
                    fx += ex * w;
                    fy += ey * w;
                }
                const projectileMultiplier = Number(process.env.DAILY_PROJECTILE_MULT || 4.5);
                for (const b of sim.enemyProjectiles) {
                    const bx = p.x - b.x;
                    const by = p.y - b.y;
                    const d2 = bx * bx + by * by;
                    if (d2 < 110 * 110) {
                        fx += (bx * projectileMultiplier) / (d2 + 30);
                        fy += (by * projectileMultiplier) / (d2 + 30);
                    }
                }
                if (process.env.FINAL_BOSS_HOLD_BLEND !== '1') {
                    const len = Math.hypot(fx, fy);
                    return len < 1e-6 ? 0 : encodeMove(fx / len, fy / len);
                }
            }
            if (finalBoss && (delayedBossMode ? chipAttack || scheduledBossAttack : p.hp > bossBudget)) {
                const dx = finalBoss.x - p.x;
                const dy = finalBoss.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                const bossRangeFactor = Number(process.env.BOSS_RANGE_FACTOR || 0.72);
                const bossRangeCap = Number(process.env.BOSS_RANGE_CAP || 260);
                const desired = Math.min(bossRangeCap, Math.max(115, effectiveBossRange(sim) * bossRangeFactor));
                const radial = d - desired;
                const tangent = ((t % 2) ? 1 : -1) * Number(process.env.BOSS_TANGENT || 0.65);
                const radialPull = Number(process.env.BOSS_RADIAL_PULL || 0.012);
                fx += (dx / d) * radial * radialPull - (dy / d) * tangent;
                fy += (dy / d) * radial * radialPull + (dx / d) * tangent;
                for (const b of sim.enemyProjectiles) {
                    const bx = p.x - b.x;
                    const by = p.y - b.y;
                    const bd = Math.hypot(bx, by) || 1;
                    if (bd < 150) { fx += bx / bd * (160 - bd) / 80; fy += by / bd * (160 - bd) / 80; }
                }
                if (process.env.FINAL_BOSS_ATTACK_BLEND !== '1') {
                    const len = Math.hypot(fx, fy);
                    return len < 1e-6 ? 0 : encodeMove(fx / len, fy / len);
                }
            }
            const farmWindows = String(process.env.BOSS_FARM_WINDOWS || '').split(',').filter(Boolean).map((part) => part.split('-').map(Number));
            const inBossWindow = !farmWindows.length || farmWindows.some(([start, end]) => sim.time >= start && sim.time < end);
            const farmBoss = process.env.BOSS_FARM === '1' && inBossWindow && sim.enemies.find((e) => e.boss && !e.def.final && e.hp > 0);
            const farmBossMinHp = Number(process.env.BOSS_FARM_MIN_HP || 0.72);
            if (farmBoss && p.hp / Math.max(1, p.maxHp) >= farmBossMinHp) {
                const dx = farmBoss.x - p.x;
                const dy = farmBoss.y - p.y;
                const d = Math.hypot(dx, dy) || 1;
                const desired = Number(process.env.BOSS_FARM_RANGE || 150);
                const radial = d - desired;
                const tangent = ((t % 2) ? 1 : -1) * Number(process.env.BOSS_FARM_TANGENT || 0.45);
                const pull = Number(process.env.BOSS_FARM_PULL || 0.02);
                fx += (dx / d) * radial * pull - (dy / d) * tangent;
                fy += (dy / d) * radial * pull + (dx / d) * tangent;
                if (process.env.BOSS_FARM_BLEND !== '1') {
                    const len = Math.hypot(fx, fy);
                    return len < 1e-6 ? 0 : encodeMove(fx / len, fy / len);
                }
            }
            if (style === 'reckless') {
                const e = nearest(sim.enemies, p);
                if (e) {
                    fx = e.x - p.x;
                    fy = e.y - p.y;
                }
            } else {
                // Kite: close in on the nearest bear, back off from anything inside ~90 units, dodge shots,
                // and hoover up XP when the coast is clear.
                const target = nearest(sim.enemies, p);
                const dailyProfile = style === 'daily';
                const pepeProfile = sim.characterId === 'pepe';
                let threatRadius = dailyProfile ? Number(process.env.DAILY_THREAT_RADIUS || (pepeProfile ? 75 : 70)) : 48;
                let projectileMultiplier = dailyProfile ? Number(process.env.DAILY_PROJECTILE_MULT || (pepeProfile ? 2 : 4.5)) : 1.5;
                const lateStart = Number(process.env.LATE_SURVIVE_START || Infinity);
                if (dailyProfile && sim.time >= lateStart) {
                    threatRadius = Number(process.env.LATE_THREAT_RADIUS || threatRadius);
                    projectileMultiplier = Number(process.env.LATE_PROJECTILE_MULT || projectileMultiplier);
                }
                let crowd = 0;
                for (const e of sim.enemies) {
                    const dx = p.x - e.x;
                    const dy = p.y - e.y;
                    const d2 = dx * dx + dy * dy;
                    const keep = (e.boss ? 150 : threatRadius) + e.size;
                    if (d2 > keep * keep) continue;
                    const w = (e.boss ? 3 : 1) / (d2 + 40);
                    fx += dx * w;
                    fy += dy * w;
                    crowd++;
                }
                for (const b of sim.enemyProjectiles) {
                    const dx = p.x - b.x;
                    const dy = p.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 110 * 110) {
                        fx += (dx * projectileMultiplier) / (d2 + 30);
                        fy += (dy * projectileMultiplier) / (d2 + 30);
                    }
                }
                const postDropStart = Number(process.env.XP_POST_DROP_START || 300);
                const postDrop = process.env.XP_POST_DROP !== '0' && sim.time >= postDropStart;
                const xpTargetRange = dailyProfile ? Number(process.env.DAILY_XP_TARGET_RANGE || 300) : 420;
                const xpCrowdLimit = dailyProfile ? Number(process.env.DAILY_XP_CROWD_LIMIT || 0) : 3;
                const crate = nearest(sim.crates || [], p, 520);
                const orb = postDrop ? bestXpTarget(sim, p, xpTargetRange) : nearest(sim.xp, p, 420);
                const projectileThreat = postDrop && sim.enemyProjectiles.some((b) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 135 * 135);
                const decoyEnabled = dailyProfile && process.env.XP_DECOY !== '0';
                const decoyCrowd = Number(process.env.XP_DECOY_CROWD || 5);
                const decoyDuration = Number(process.env.XP_DECOY_SECONDS || 2.5) * 60;
                const decoyGate = Number(process.env.XP_DECOY_MIN_HP || 0.55);
                const decoyMinDistance = Number(process.env.XP_DECOY_MIN_DISTANCE || 120);
                if (xpRecovery && xpRecovery.orb.dead) {
                    if (xpRecovery.orb.collected) {
                        if (xpRecovery.phase === 'return') diagnostics.returnCollected++;
                        else diagnostics.decoyCollected++;
                    } else diagnostics.targetExpired++;
                    xpRecovery = null;
                }
                if (xpRecovery?.phase === 'decoy' && t >= xpRecovery.until) {
                    xpRecovery.phase = 'return';
                    diagnostics.returnStarts++;
                }
                const orbDistance = orb ? Math.hypot(orb.x - p.x, orb.y - p.y) : 0;
                if (decoyEnabled && orb && orbDistance >= decoyMinDistance && t >= nextDecoyAt
                    && !projectileThreat && p.hp / Math.max(1, p.maxHp) >= decoyGate && crowd >= decoyCrowd && !xpRecovery) {
                    let ax = 0;
                    let ay = 0;
                    const awayX = (p.x - orb.x) / (orbDistance || 1);
                    const awayY = (p.y - orb.y) / (orbDistance || 1);
                    for (const e of sim.enemies) {
                        const dx = p.x - e.x;
                        const dy = p.y - e.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 > 240 * 240) continue;
                        const weight = 1 / (d2 + 80);
                        ax += dx * weight;
                        ay += dy * weight;
                    }
                    const enemyLength = Math.hypot(ax, ay) || 1;
                    const awayWeight = Number(process.env.XP_DECOY_AWAY_WEIGHT || 1);
                    const threatWeight = Number(process.env.XP_DECOY_THREAT_WEIGHT || 0.35);
                    ax = awayX * awayWeight + (ax / enemyLength) * threatWeight;
                    ay = awayY * awayWeight + (ay / enemyLength) * threatWeight;
                    const al = Math.hypot(ax, ay);
                    if (al > 1e-6) {
                        xpRecovery = { phase: 'decoy', until: t + decoyDuration, x: ax / al, y: ay / al, orb };
                        nextDecoyAt = t + Number(process.env.XP_DECOY_COOLDOWN || 10) * 60;
                        diagnostics.decoyStarts++;
                    }
                }
                if (xpRecovery?.phase === 'decoy') {
                    fx += xpRecovery.x * Number(process.env.XP_DECOY_FORCE || 0.025);
                    fy += xpRecovery.y * Number(process.env.XP_DECOY_FORCE || 0.025);
                } else if (xpRecovery?.phase === 'return') {
                    diagnostics.returnTicks++;
                    const targetOrb = xpRecovery.orb;
                    const urgency = 1 + Math.max(0, 8 - targetOrb.life) / 8;
                    const dx = targetOrb.x - p.x;
                    const dy = targetOrb.y - p.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const force = Number(process.env.XP_RETURN_FORCE || 0.045) * urgency;
                    fx += (dx / d) * force;
                    fy += (dy / d) * force;
                    if (d < 24) xpRecovery = null;
                } else if (crate && crowd < Number(process.env.CRATE_MAX_CROWD || 2)) {
                    const dx = crate.x - p.x;
                    const dy = crate.y - p.y;
                    const d = Math.hypot(dx, dy) || 1;
                    fx += (dx / d) * Number(process.env.CRATE_ATTRACTION || 0.02);
                    fy += (dy / d) * Number(process.env.CRATE_ATTRACTION || 0.02);
                } else if (orb && (postDrop ? (crowd < xpCrowdLimit || orb.life < 8) && !projectileThreat : crowd < 3)) {
                    const dx = orb.x - p.x;
                    const dy = orb.y - p.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const urgency = postDrop ? 1 + Math.max(0, 8 - orb.life) / 8 : 1;
                    const xpAttraction = (dailyProfile ? Number(process.env.DAILY_XP_ATTRACTION || 0.012) : 0.012) * urgency;
                    fx += (dx / d) * xpAttraction;
                    fy += (dy / d) * xpAttraction;
                } else if (target && crowd === 0) {
                    const dx = target.x - p.x;
                    const dy = target.y - p.y;
                    const d = Math.hypot(dx, dy) || 1;
                    if (d > 70) {
                        fx += (dx / d) * 0.01;
                        fy += (dy / d) * 0.01;
                    }
                }
                const softBoss = process.env.BOSS_SOFT === '1' && inBossWindow && sim.enemies.find((e) => e.boss && !e.def.final && e.hp > 0);
                if (softBoss && p.hp / Math.max(1, p.maxHp) >= Number(process.env.BOSS_SOFT_MIN_HP || 0.75)) {
                    const dx = softBoss.x - p.x;
                    const dy = softBoss.y - p.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const desired = Number(process.env.BOSS_SOFT_RANGE || 180);
                    const radial = d - desired;
                    const pull = Number(process.env.BOSS_SOFT_PULL || 0.003);
                    fx += (dx / d) * radial * pull;
                    fy += (dy / d) * radial * pull;
                }
                // A little sideways drift so it circles instead of standing in one spot.
                const drift = dailyProfile ? Number(process.env.DAILY_DRIFT || (pepeProfile ? 0.003 : 0.0015)) : 0.0015;
                fx += Math.cos(t / 200) * drift;
                fy += Math.sin(t / 200) * drift;
            }
            const len = Math.hypot(fx, fy);
            if (len < 1e-6) return 0;
            return encodeMove(fx / len, fy / len);
        },
        /** Card to pick: prefer evolutions, then new weapons, then weapon levels, then passives. */
        pick(sim) {
            const score = (c) =>
                c.evolves
                    ? 5
                    : c.kind === 'weapon'
                      ? c.isNew
                          ? 4
                          : 3
                      : c.kind === 'passive'
                        ? 2
                        : 0;
            let best = 0;
            sim.choices.forEach((c, i) => {
                if (score(c) > score(sim.choices[best])) best = i;
            });
            return best;
        },
        diagnostics,
    };
}

function nearest(list, p, maxD = Infinity) {
    let best = null;
    let bd = maxD * maxD;
    for (const it of list) {
        const d2 = (it.x - p.x) ** 2 + (it.y - p.y) ** 2;
        if (d2 < bd) {
            bd = d2;
            best = it;
        }
    }
    return best;
}

function bestXpTarget(sim, p, maxD) {
    let best = null;
    let bestScore = -Infinity;
    const maxD2 = maxD * maxD;
    for (const orb of sim.xp) {
        const dx = orb.x - p.x;
        const dy = orb.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;
        const distance = Math.sqrt(d2);
        const expiryUrgency = 1 + Math.max(0, 8 - orb.life) / 8;
        const score = (orb.value * expiryUrgency) / (distance + 90);
        if (score > bestScore) {
            bestScore = score;
            best = orb;
        }
    }
    return best;
}

function effectiveBossRange(sim) {
    const ranges = sim.player.weapons.map((w) => w.getRange(sim.player));
    return ranges.length ? Math.max(...ranges) * 0.72 : 150;
}

/** Engage the final boss only when the measured run DPS and current health budget support a safe finish. */
function finalBossDamageBudget(sim, boss) {
    const measuredDps = sim.stats.damageDealt / Math.max(60, sim.time);
    const bossDpsFactor = Number(process.env.FINAL_BOSS_DPS_FACTOR || 0.55);
    const estimatedFightSeconds = boss.hp / Math.max(1, measuredDps * bossDpsFactor);
    const incomingDps = sim.stats.damageTaken / Math.max(60, sim.time);
    const safetyFactor = Number(process.env.FINAL_BOSS_INCOMING_FACTOR || 1.5);
    const regen = sim.player._sum('hpRegen');
    const effectiveHp = sim.player.hp + sim.player.getDamageReduction() * sim.player.maxHp + regen * estimatedFightSeconds;
    const projectedIncoming = incomingDps * safetyFactor * estimatedFightSeconds;
    return effectiveHp >= projectedIncoming * 1.15;
}
