import { Simulation } from './src/sim/sim.js';
import { createBot } from './src/sim/bot.js';
import { RunRecorder, toBase64Url } from './src/sim/runlog.js';
import { dailyTwistForSeed, PASSIVES, WEAPONS } from './src/sim/content.js';

const TARGET = Number(process.env.DESIRED_SCORE || 300_000);
const DEFAULT_SEEDS = [1, 42, 424242, 8675309, 20260924];

const WEAPON_VALUE = Object.freeze({
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
  const hpRatio = sim.player.hp / Math.max(1, sim.player.maxHp);
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
    }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function runBot(seed, { mode = 'free', twist = null, phase = 0, style = 'survive' } = {}) {
  const resolvedTwist = mode === 'daily' ? (twist || dailyTwistForSeed(seed)) : null;
  const sim = new Simulation({ seed, twist: resolvedTwist });
  const recorder = new RunRecorder(seed, resolvedTwist);
  const bot = createBot({ style, phase });
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

export function createInteractiveRun(seed, { mode = 'free', twist = null, phase = 0, style = 'survive' } = {}) {
  const resolvedTwist = mode === 'daily' ? (twist || dailyTwistForSeed(seed)) : null;
  return {
    sim: new Simulation({ seed, twist: resolvedTwist }),
    recorder: new RunRecorder(seed, resolvedTwist),
    bot: createBot({ style, phase }),
    seed,
    twist: resolvedTwist,
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
