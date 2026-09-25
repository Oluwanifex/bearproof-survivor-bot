import { Simulation } from './src/sim/sim.js';
import { createBot } from './src/sim/bot.js';
import { RunRecorder, toBase64Url } from './src/sim/runlog.js';
import { dailyTwistForSeed, PASSIVES, WEAPONS } from './src/sim/content.js';
import { BuildPlanner } from './src/sim/planner.js';

const TARGET = Number(process.env.DESIRED_SCORE || 300_000);
const DEFAULT_SEEDS = [1, 42, 424242, 8675309, 20260924];

const WEAPON_VALUE = Object.freeze({
  tongue: 102,
  buyback: 100,
  diamond_hands: 96,
  laser_eyes: 94,
  circuit_breaker: 91,
  green_candle: 89,
  airdrop: 87,
  dead_cat_bounce: 84,
  limit_order: 82,
  hopium: 78,
  horns: 70,
});
const PASSIVE_VALUE = Object.freeze({
  thick_skin: 100,
  hedge: 98,
  cold_wallet: 96,
  dca: 94,
  slippage: 91,
  momentum: 89,
  high_frequency: 87,
  conviction: 86,
  liquidity: 84,
  compounding: 82,
  whale_gravity: 80,
  alpha: 79,
  leverage: 55,
});

export function chooseUpgrade(sim) {
  const overrides = String(process.env.CHOICE_OVERRIDE || '').split(',').map((entry) => entry.split(':').map(Number));
  const levelOverride = overrides.find(([level, index]) => sim.player.level === level && Number.isInteger(index) && index >= 0 && index < sim.choices.length);
  if (levelOverride) return levelOverride[1];
  if (sim.player.level === 26) return 2;
  if (sim.player.level === 33) return 1;
  if (sim.planner && process.env.USE_PLANNER === '1') return sim.planner.choose(sim, { lookahead: true });
  const hpRatio = sim.player.hp / Math.max(1, sim.player.maxHp);
  if (sim.characterId === 'pepe') {
    const pepeDefenseBias = Number(process.env.PEPE_DEFENSE_BIAS || 0);
    const pepeDefenseUntil = Number(process.env.PEPE_DEFENSE_UNTIL || 600);
    const pepeAttackBias = Number(process.env.PEPE_ATTACK_BIAS || process.env.ATTACK_BIAS || 0);
    const pepeAttackStart = Number(process.env.PEPE_ATTACK_START || process.env.ATTACK_BIAS_START || 600);
    const pepeAttackMinHp = Number(process.env.PEPE_ATTACK_MIN_HP || process.env.ATTACK_BIAS_MIN_HP || 0.7);
    const pepeHeal = sim.choices.findIndex((card) => card.kind === 'heal');
    if (pepeHeal >= 0 && hpRatio < 0.86) return pepeHeal;
    let pepeBest = 0;
    let pepeScore = -Infinity;
    sim.choices.forEach((card, index) => {
      let score = 0;
      if (card.kind === 'heal') score = hpRatio < 0.72 ? 140 : 5;
      else if (card.kind === 'passive') {
        const count = sim.player.passives[card.id]?.count || 0;
        const survival = { thick_skin: 125, hedge: 118, cold_wallet: 112, dca: 108, slippage: 104 };
        const damage = { high_frequency: 82, conviction: 76, liquidity: 72, alpha: 68, momentum: 62 };
        score = (survival[card.id] || damage[card.id] || 35) + count * 8;
        if (hpRatio < 0.88 && survival[card.id]) score += 55;
        if (survival[card.id] && sim.time < pepeDefenseUntil) score += pepeDefenseBias;
        if (hpRatio >= 0.95 && damage[card.id]) score += 24;
      } else if (card.kind === 'weapon') {
        const current = sim.player.weapons.find((weapon) => weapon.id === card.id);
        score = card.id === 'tongue' ? 112 : 62;
        score += (current?.level || 0) * 6;
        if (card.evolves) score += 72;
        if (card.isNew) score += 10;
      }
      if (pepeAttackBias > 0 && sim.time >= pepeAttackStart && hpRatio >= pepeAttackMinHp) {
        if (card.kind === 'weapon' && ['tongue', 'laser_eyes', 'buyback', 'circuit_breaker', 'diamond_hands', 'airdrop'].includes(card.id)) score += pepeAttackBias;
        if (card.kind === 'passive' && ['high_frequency', 'conviction', 'alpha', 'liquidity', 'momentum'].includes(card.id)) score += pepeAttackBias * 0.55;
      }
      if (score > pepeScore) { pepeScore = score; pepeBest = index; }
    });
    return pepeBest;
  }
  const attackBias = Number(process.env.ATTACK_BIAS || 0);
  const defenseBias = Number(process.env.DEFENSE_BIAS || 0);
  const attackStart = Number(process.env.ATTACK_BIAS_START || 600);
  const attackMinHp = Number(process.env.ATTACK_BIAS_MIN_HP || 0.62);
  const emergencyHeal = sim.choices.findIndex((card) => card.kind === 'heal');
  if (emergencyHeal >= 0 && hpRatio < 0.78) return emergencyHeal;
  let bestIndex = 0;
  let bestScore = -Infinity;
  sim.choices.forEach((card, index) => {
    let score = 0;
    if (card.kind === 'heal') {
      score = hpRatio < 0.58 ? 150 : 8;
    } else if (card.kind === 'weapon') {
      const current = sim.player.weapons.find((weapon) => weapon.id === card.id);
      const level = current?.level || 0;
      score = (WEAPON_VALUE[card.id] || 60) + (card.isNew ? 18 : 0) + level * 7;
      if (card.evolves) score += 80;
    } else if (card.kind === 'passive') {
      const current = sim.player.passives[card.id]?.count || 0;
      score = (PASSIVE_VALUE[card.id] || 50) + current * 5;
      if (hpRatio < 0.6 && ['thick_skin', 'hedge', 'cold_wallet', 'dca', 'slippage'].includes(card.id)) score += 25;
      if (card.id === 'whale_gravity' && sim.stats.xpSpawned > 0) {
        const pickupRangeCap = Math.max(0, Number(process.env.PICKUP_RANGE_CAP || 0));
        const currentCount = sim.player.passives.whale_gravity?.count || 0;
        const pickupRangeUntil = Number(process.env.PICKUP_RANGE_UNTIL || 360);
        if (pickupRangeCap > 0) {
          if (currentCount < pickupRangeCap && sim.time < pickupRangeUntil) {
            score += Number(process.env.PICKUP_RANGE_BONUS || 45);
          } else {
            score -= Number(process.env.PICKUP_RANGE_EXCESS_PENALTY || 1000);
          }
        }
      }
      if (card.id === 'compounding' && sim.stats.xpExpired > sim.stats.xpCollected) score += 22;
      if (defenseBias > 0 && card.kind === 'passive') {
        if (['thick_skin', 'hedge', 'cold_wallet', 'dca', 'slippage'].includes(card.id)) score += defenseBias;
        if (card.id === 'whale_gravity') score += defenseBias * 0.5;
      }
    }
    if (attackBias > 0 && sim.time >= attackStart && hpRatio >= attackMinHp) {
      if (card.kind === 'weapon' && ['laser_eyes', 'buyback', 'circuit_breaker', 'diamond_hands', 'airdrop'].includes(card.id)) score += attackBias;
      if (card.kind === 'passive' && ['high_frequency', 'conviction', 'alpha', 'liquidity', 'momentum'].includes(card.id)) score += attackBias * 0.55;
    }
    if (sim.time >= 720 && sim.enemies.some((enemy) => enemy.boss && enemy.def.final && enemy.hp > 0)) {
      if (card.evolves) score += 55;
      if (card.kind === 'weapon' && ['laser_eyes', 'buyback', 'circuit_breaker', 'diamond_hands'].includes(card.id)) score += 24;
      if (card.kind === 'passive' && ['conviction', 'high_frequency', 'alpha', 'liquidity', 'leverage'].includes(card.id)) score += 18;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function runBot(seed, { mode = 'free', twist = null, character = process.env.CHARACTER || 'bull', phase = 0, style = 'survive' } = {}) {
  const resolvedTwist = mode === 'daily' ? (twist || dailyTwistForSeed(seed)) : null;
  const sim = new Simulation({ seed, twist: resolvedTwist, character });
  const planner = new BuildPlanner();
  sim.planner = planner;
  const recorder = new RunRecorder(seed, resolvedTwist, character);
  const bot = createBot({ style, phase });
  sim.botMove = (state) => bot.move(state);
  while (!sim.over) {
    if (sim.choices) {
      const index = chooseUpgrade(sim);
      recorder.pick(sim.tick, index);
      sim.choose(index);
      continue;
    }
    const code = bot.move(sim);
    recorder.tick(code);
    sim.step(code);
    sim.drainEvents();
  }
  return { summary: sim.summary(), log: recorder.toBytes(), hash: sim.stateHash(), twist: resolvedTwist };
}

export function createInteractiveRun(seed, { mode = 'free', twist = null, character = process.env.CHARACTER || 'bull', phase = 0, style = 'survive' } = {}) {
  const resolvedTwist = mode === 'daily' ? (twist || dailyTwistForSeed(seed)) : null;
  const sim = new Simulation({ seed, twist: resolvedTwist, character });
  const bot = createBot({ style, phase });
  sim.planner = new BuildPlanner();
  sim.botMove = (state) => bot.move(state);
  return {
    sim,
    recorder: new RunRecorder(seed, resolvedTwist),
    bot,
    seed,
    twist: resolvedTwist,
    character,
    mode,
  };
}

export function upgradeDescription(card) {
  if (card.kind === 'heal') return 'Take Profit · restore 30 HP';
  const definition = card.kind === 'weapon'
    ? Object.values(WEAPONS).find((weapon) => weapon.id === card.id)
    : Object.values(PASSIVES).find((passive) => passive.id === card.id);
  const title = definition?.name || String(card.id).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const tags = [card.isNew ? 'new' : null, card.evolves ? 'evolution' : null, card.level ? `level ${card.level}` : null].filter(Boolean);
  const effect = card.evolves
    ? definition?.evolveDescription
    : definition?.description;
  return `${title}${tags.length ? ` · ${tags.join(' · ')}` : ''}${effect ? ` — ${effect}` : ''}`;
}

export function advanceInteractiveRun(run, { choice = null, maxTicks = 3_000 } = {}) {
  const { sim, recorder, bot } = run;
  if (sim.choices) {
    if (!Number.isInteger(choice) || choice < 0 || choice >= sim.choices.length) {
      return { status: 'choice', choices: sim.choices };
    }
    recorder.pick(sim.tick, choice);
    sim.choose(choice);
  }
  let ticks = 0;
  while (!sim.over && !sim.choices && ticks < maxTicks) {
    const code = bot.move(sim);
    recorder.tick(code);
    sim.step(code);
    sim.drainEvents();
    ticks += 1;
  }
  if (sim.choices) return { status: 'choice', choices: sim.choices, summary: sim.summary() };
  if (sim.over) return { status: 'done', summary: sim.summary(), log: recorder.toBytes(), hash: sim.stateHash(), twist: run.twist };
  return { status: 'running', summary: sim.summary() };
}

if (process.argv[1]?.endsWith('/run-bot.mjs')) {
  const seeds = process.argv.slice(2).map(Number).filter(Number.isFinite);
  for (const seed of seeds.length ? seeds : DEFAULT_SEEDS) {
    const run = runBot(seed);
    const status = run.summary.score >= TARGET ? 'TARGET_REACHED' : 'BELOW_TARGET';
    console.log(JSON.stringify({ seed, status, target: TARGET, ...run.summary, replayBytes: run.log.length, hash: run.hash }));
  }
}

export { toBase64Url };
