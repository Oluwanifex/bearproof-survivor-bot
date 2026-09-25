import { Simulation } from '../src/sim/sim.js';
import { createBot } from '../src/sim/bot.js';
import { RunRecorder, replay } from '../src/sim/runlog.js';
import { chooseUpgrade } from '../run-bot.mjs';
import { BuildPlanner } from '../src/sim/planner.js';

const seed = 3994460340;
const twist = 'whale_season';
const base = {
  CHARACTER: 'bull', CHOICE_OVERRIDE: '27:2,28:1,29:0',
  XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3',
  XP_DECOY_FORCE: '0.025', XP_DECOY_MIN_HP: '0.55', XP_RETURN_FORCE: '0.045',
  DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015',
  DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0',
  LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5',
  WEAPON_COOLDOWN_MULT: '0.2', FIRE_RATE_HORNS: '0.2', FIRE_RATE_LASER_EYES: '0.2',
  FIRE_RATE_BUYBACK: '0.2', FIRE_RATE_DEAD_CAT_BOUNCE: '0.2', FIRE_RATE_AIRDROP: '0.2',
  FIRE_RATE_GREEN_CANDLE: '0.2',
};
const fixed = {
  FINAL_BOSS_CHIP_START: '1080', FINAL_BOSS_HOLD_RANGE: '850',
  FINAL_BOSS_KILL_WINDOW: '30', FINAL_BOSS_INCOMING_FACTOR: '0.8',
  PICKUP_RANGE_CAP: '1', PICKUP_RANGE_BONUS: '150', PICKUP_RANGE_EXCESS_PENALTY: '1000',
  USE_PLANNER: '1',
};
const variants = [
  { name: 'repeat_1180_xp012', env: { ...fixed, FINAL_BOSS_ENGAGE_AT: '1180', FINAL_BOSS_LATEST_ENGAGE_AT: '1198' } },
  { name: 'engage_1178_minus2_xp012', env: { ...fixed, FINAL_BOSS_ENGAGE_AT: '1178', FINAL_BOSS_LATEST_ENGAGE_AT: '1196' } },
  { name: 'engage_1182_plus2_xp012', env: { ...fixed, FINAL_BOSS_ENGAGE_AT: '1182', FINAL_BOSS_LATEST_ENGAGE_AT: '1200' } },
  { name: 'repeat_1180_check_hash_xp012', env: { ...fixed, FINAL_BOSS_ENGAGE_AT: '1180', FINAL_BOSS_LATEST_ENGAGE_AT: '1198' } },
];

function runVariant(variant) {
  for (const [key, value] of Object.entries(base)) process.env[key] = value;
  const optional = ['FINAL_BOSS_CHIP_START', 'FINAL_BOSS_ENGAGE_AT', 'FINAL_BOSS_LATEST_ENGAGE_AT', 'FINAL_BOSS_HOLD_RANGE', 'FINAL_BOSS_HOLD_PULL', 'FINAL_BOSS_HOLD_TANGENT', 'FINAL_BOSS_KILL_WINDOW', 'FINAL_BOSS_MIN_REMAINING_HP', 'FINAL_BOSS_DPS_FACTOR', 'FINAL_BOSS_INCOMING_FACTOR', 'PICKUP_RANGE_CAP', 'PICKUP_RANGE_BONUS', 'PICKUP_RANGE_EXCESS_PENALTY', 'PICKUP_RANGE_UNTIL', 'DAILY_THREAT_RADIUS', 'USE_PLANNER', 'ATTACK_BIAS', 'ATTACK_BIAS_START', 'ATTACK_BIAS_MIN_HP'];
  for (const key of optional) delete process.env[key];
  for (const [key, value] of Object.entries(variant.env)) process.env[key] = value;
  const sim = new Simulation({ seed, twist, character: 'bull' });
  sim.planner = new BuildPlanner();
  const bot = createBot({ style: 'daily', phase: -1 });
  sim.botMove = (state) => bot.move(state);
  const recorder = new RunRecorder(seed, twist, 'bull');
  const milestones = {};
  const picks = [];
  const bossHealth = [];
  let finalBossDownAt = null;
  while (!sim.over) {
    if (sim.player.level >= 30 && milestones.level30 === undefined) milestones.level30 = sim.time;
    if (sim.choices) {
      const offered = sim.choices.map((card) => ({ kind: card.kind, id: card.id, level: card.level, evolves: !!card.evolves, isNew: !!card.isNew }));
      const index = chooseUpgrade(sim);
      const chosen = offered[index];
      picks.push({ tick: sim.tick, time: sim.time, level: sim.player.level, ...chosen });
      recorder.pick(sim.tick, index);
      sim.choose(index);
      continue;
    }
    const code = bot.move(sim);
    recorder.tick(code);
    sim.step(code);
    const boss = sim.enemies.find((enemy) => enemy.boss && enemy.def.final && enemy.hp > 0);
    if (boss && sim.tick % 600 === 0) bossHealth.push({ time: Math.round(sim.time), hp: Math.ceil(boss.hp), playerHp: Math.ceil(sim.player.hp), maxPlayerHp: Math.ceil(sim.player.maxHp) });
    for (const event of sim.drainEvents()) {
      if (event.t === 'bossDown' && sim.won) finalBossDownAt = sim.time;
    }
    if (sim.player.level >= 30 && milestones.level30 === undefined) milestones.level30 = sim.time;
  }
  const checked = replay(recorder.toBytes());
  return {
    name: variant.name, overrides: variant.env, summary: sim.summary(),
    milestones: { level30Seconds: milestones.level30 ?? null, finalBossSeconds: finalBossDownAt },
    bossHealth, whalePicks: picks.filter((pick) => pick.id === 'whale_gravity').map(({ time, level }) => ({ time: Math.round(time * 10) / 10, level })),
    picks: picks.map(({ time, level, kind, id, evolves }) => ({ time: Math.round(time * 10) / 10, level, kind, id, evolves })),
    hash: sim.stateHash(),
    replay: { ok: checked.ok, hash: checked.hash, score: checked.summary?.score, reason: checked.summary?.reason },
  };
}

for (const variant of variants) {
  console.log(JSON.stringify(runVariant(variant)));
}
