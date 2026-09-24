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
    return {
        /** Move code for this tick. */
        move(sim) {
            t++;
            const p = sim.player;
            let fx = 0;
            let fy = 0;
            const finalBoss = sim.enemies.find((e) => e.boss && e.def.final && e.hp > 0);
            const bossBudgetFactor = Number(process.env.BOSS_BUDGET_FACTOR || 0.65);
            const bossBudget = p.maxHp * bossBudgetFactor + p.getDamageReduction() * p.maxHp;
            if (sim.won && process.env.FARM_AFTER_WIN === '1') {
                const farmEnemyWeight = Number(process.env.FARM_ENEMY_WEIGHT || 4);
                const farmBossWeight = Number(process.env.FARM_BOSS_WEIGHT || 5);
                const farmProjectileWeight = Number(process.env.FARM_PROJECTILE_WEIGHT || 5);
                for (const e of sim.enemies) {
                    const dx = p.x - e.x;
                    const dy = p.y - e.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > 260 * 260) continue;
                    const w = (e.boss ? farmBossWeight : farmEnemyWeight) / (d2 + 80);
                    fx += dx * w;
                    fy += dy * w;
                }
                for (const b of sim.enemyProjectiles) {
                    const dx = p.x - b.x;
                    const dy = p.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 180 * 180) {
                        fx += dx * farmProjectileWeight / (d2 + 30);
                        fy += dy * farmProjectileWeight / (d2 + 30);
                    }
                }
                fx += Math.cos(t / 160) * 0.002;
                fy += Math.sin(t / 160) * 0.002;
                const len = Math.hypot(fx, fy);
                return len < 1e-6 ? 0 : encodeMove(fx / len, fy / len);
            }
            if (finalBoss && p.hp > bossBudget) {
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
                const len = Math.hypot(fx, fy);
                return len < 1e-6 ? 0 : encodeMove(fx / len, fy / len);
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
                const threatRadius = dailyProfile ? Number(process.env.DAILY_THREAT_RADIUS || 70) : 48;
                const projectileMultiplier = dailyProfile ? Number(process.env.DAILY_PROJECTILE_MULT || 4.5) : 1.5;
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
                const orb = postDrop ? bestXpTarget(sim, p, xpTargetRange) : nearest(sim.xp, p, 420);
                const projectileThreat = postDrop && sim.enemyProjectiles.some((b) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 135 * 135);
                if (orb && (postDrop ? (crowd < xpCrowdLimit || orb.life < 8) && !projectileThreat : crowd < 3)) {
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
                // A little sideways drift so it circles instead of standing in one spot.
                const drift = dailyProfile ? Number(process.env.DAILY_DRIFT || 0.0015) : 0.0015;
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
        }
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
