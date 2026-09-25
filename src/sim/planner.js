import { PASSIVES, SIM, WEAPONS, weaponDef } from './content.js';
import { Weapon } from './weapons.js';

const DAMAGE_PASSIVES = new Set(['conviction', 'leverage', 'high_frequency', 'liquidity', 'alpha']);
const SURVIVAL_PASSIVES = new Set(['thick_skin', 'hedge', 'cold_wallet', 'dca', 'slippage']);

/** Stateful, deterministic build planner. It reserves the best remaining weapon slots and evolves one line at a time. */
export class BuildPlanner {
    constructor() {
        this.reservedWeapons = [];
        this.primary = null;
        this.phase = 'opening';
        this.history = [];
    }

    update(sim) {
        const weapons = sim.player.weapons;
        const owned = new Set(weapons.map((w) => w.id));
        const available = Object.values(WEAPONS)
            .filter((d) => !owned.has(d.id))
            .sort((a, b) => weaponPotential(b) - weaponPotential(a));
        const desired = weapons
            .filter((w) => w.level < SIM.WEAPON_MAX_LEVEL)
            .sort((a, b) => completionUrgency(b) - completionUrgency(a))[0];
        this.primary = desired?.id || this.primary;
        const slots = Math.max(0, SIM.MAX_WEAPONS - weapons.length);
        this.reservedWeapons = [
            ...(desired ? [desired.id] : []),
            ...available.map((d) => d.id)
        ].filter((id, i, all) => all.indexOf(id) === i).slice(0, slots + 1);
        this.phase = sim.time < 360 ? 'opening' : sim.time < 660 ? 'scaling' : 'boss';
        if (sim.player.weapons.some((w) => w.isEvolved())) this.phase = sim.time >= 660 ? 'boss' : 'scaling';
    }

    score(card, sim) {
        this.update(sim);
        const hpRatio = sim.player.hp / Math.max(1, sim.player.maxHp);
        if (card.kind === 'heal') return hpRatio < 0.55 ? 150 : hpRatio < 0.75 ? 35 : 2;
        if (card.kind === 'weapon') {
            const w = sim.player.weapons.find((x) => x.id === card.id);
            const def = weaponDef(card.id);
            const nextLevel = w ? w.level + 1 : 1;
            let score = marginalWeaponDps(card, sim) * 3;
            score += card.evolves ? 240 : 0;
            score += w ? (nextLevel >= def.evolveLevel ? 190 : 55 + nextLevel * 14) : 38;
            score += this.reservedWeapons.includes(card.id) ? 65 : -45;
            if (this.primary === card.id) score += 100;
            if (this.phase === 'boss' && (def.type === 'projectile' || def.type === 'instant' || def.type === 'drain' || def.type === 'aura')) score += 35;
            return score;
        }
        const current = sim.player.passives[card.id]?.count || 0;
        let score = passiveMarginal(card.id, sim);
        score += current * 3;
        if (card.id === 'whale_gravity') {
            const pickupRangeCap = Math.max(0, Number(process.env.PICKUP_RANGE_CAP || 0));
            if (pickupRangeCap > 0) {
                const until = Number(process.env.PICKUP_RANGE_UNTIL || 360);
                if (current < pickupRangeCap && sim.time < until) score += Number(process.env.PICKUP_RANGE_BONUS || 45);
                else score -= Number(process.env.PICKUP_RANGE_EXCESS_PENALTY || 1000);
            }
        }
        if (this.phase === 'opening' && SURVIVAL_PASSIVES.has(card.id)) score += 25;
        if (this.phase === 'boss' && DAMAGE_PASSIVES.has(card.id)) score += 60;
        if (SURVIVAL_PASSIVES.has(card.id)) score += hpRatio < 0.82 ? 70 : 28;
        if (DAMAGE_PASSIVES.has(card.id) && (this.phase === 'opening' || hpRatio < 0.72)) score -= 55;
        if (hpRatio > 0.9 && SURVIVAL_PASSIVES.has(card.id)) score -= 12;
        return score;
    }

    choose(sim, { lookahead = true } = {}) {
        if (!sim.choices?.length) return 0;
        const ranked = sim.choices.map((card, index) => ({ card, index, score: this.score(card, sim) }))
            .sort((a, b) => b.score - a.score);
        let selected = ranked[0];
        const hpRatio = sim.player.hp / Math.max(1, sim.player.maxHp);
        if (lookahead && ranked.length > 1 && sim.time > 120 && sim.time < 1080 && hpRatio > 0.78) {
            const candidates = ranked.slice(0, Math.min(3, ranked.length));
            const projected = candidates.map((candidate) => ({
                ...candidate,
                horizon: deterministicLookahead(sim, candidate.index, this)
            })).sort((a, b) => (b.horizon + b.score * 0.15) - (a.horizon + a.score * 0.15));
            selected = projected[0];
        }
        this.history.push({ level: sim.player.level, choices: sim.choices.map((c) => ({ ...c })), selected: selected.index, scores: ranked.map((r) => r.score) });
        return selected.index;
    }
}

export function marginalWeaponDps(card, sim) {
    const def = weaponDef(card.id);
    const current = sim.player.weapons.find((w) => w.id === card.id);
    const before = current ? weaponDps(current, sim) : 0;
    const probe = current ? new Weapon(def) : new Weapon(def);
    probe.level = current ? current.level + 1 : 1;
    const after = weaponDps(probe, sim);
    const nearby = sim.enemies.reduce((n, e) => n + (e.boss ? 2.5 : 1), 0);
    return Math.max(0, after - before) * Math.max(1, Math.min(10, nearby / 4));
}

function weaponDps(w, sim) {
    const p = sim.player;
    const d = w.getDamage(p);
    const cd = Math.max(0.05, w.getCooldown(p));
    const def = w.def;
    let hits = def.projectileCount || 1;
    if (w.isEvolved()) hits += def.evolveExtraCount || 0;
    if (def.type === 'orbit') hits = w.orbitCount(p);
    if (def.type === 'instant' && w.level >= (def.chainFromLevel || 99)) hits += def.chainCount || 0;
    if (def.type === 'aura' || def.type === 'melee' || def.type === 'nova') hits *= Math.max(1, Math.min(5, sim.enemies.length / 12));
    if (def.type === 'drain' && w.isEvolved()) hits *= 2;
    return d * hits * (1 + p.getCritChance()) / cd;
}

function passiveMarginal(id, sim) {
    const p = sim.player;
    const def = Object.values(PASSIVES).find((x) => x.id === id);
    if (!def) return 0;
    const effect = def.effect;
    let score = 5;
    if (effect.damageMult) score += 100 * effect.damageMult;
    if (effect.cooldownMult) score += 120 * -effect.cooldownMult;
    if (effect.areaMult) score += 55 * effect.areaMult;
    if (effect.critChance) score += 80 * effect.critChance;
    if (effect.expMult) score += 28 * effect.expMult;
    if (effect.magnetMult) score += 12 * effect.magnetMult;
    if (effect.maxHpMult) score += p.hp < p.maxHp * 0.7 ? 32 : 12;
    if (effect.damageReduction || effect.armor || effect.dodgeChance || effect.hpRegen) score += 18;
    return score;
}

function weaponPotential(def) {
    const typeBonus = { projectile: 34, instant: 32, drain: 30, aura: 28, orbit: 26, nova: 24, melee: 18, mine: 15 }[def.type] || 10;
    return (def.baseDamage / Math.max(0.1, def.baseCooldown)) * typeBonus;
}
function completionUrgency(w) { return w.level + (w.isEvolved() ? 100 : 0); }

/** Run a bounded, deterministic branch from a cloned state and return its projected value. */
export function deterministicLookahead(sim, cardIndex, planner, horizonSeconds = 10) {
    const branch = sim.clone();
    branch.choose(cardIndex);
    const start = { score: branch.stats.score, kills: branch.stats.kills, damage: branch.stats.damageDealt, hp: branch.player.hp };
    const move = sim.botMove || (() => 0);
    const ticks = Math.min(Math.round(horizonSeconds * SIM.TICK_RATE), 30 * SIM.TICK_RATE);
    for (let i = 0; i < ticks && !branch.over; i++) {
        if (branch.choices) branch.choose(0);
        branch.step(move(branch));
        branch.drainEvents();
    }
    const killGain = branch.stats.kills - start.kills;
    const damageGain = branch.stats.damageDealt - start.damage;
    const survival = branch.player.hp - start.hp;
    return killGain * 30 + damageGain * 0.08 + survival * 2 + (branch.over && branch.endReason === 'liquidated' ? -10000 : 0);
}
