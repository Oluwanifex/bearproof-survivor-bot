import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { Simulation } from '../src/sim/sim.js';
import { createBot } from '../src/sim/bot.js';
import { dailyTwistForSeed } from '../src/sim/content.js';
import { chooseBuild4Profile, chooseBuild4Upgrade } from '../run-bot.mjs';
import { RunRecorder, replay } from '../src/sim/runlog.js';

let LIVE = Object.freeze({ date: '2026-09-26', seed: 526031759, twist: 'flash_crash', stage: 'winter' });
const PHYSICS_OVERRIDES = /^(WEAPON_COOLDOWN_MULT|FIRE_RATE_|WEAPON_SPREAD_MULT|SPREAD_|PLAYER_SPEED_MULT|ENEMY_SPEED_MULT|PLAYER_DAMAGE_MULT|ENEMY_HP_MULT|ENEMY_DMG_MULT|SPAWN_MULT|XP_MULT|MAX_TICKS|TICK_RATE|SIM_)/;
const STRATEGY_KEYS = /^(DAILY_|LATE_|XP_|CRATE_|BOSS_|FINAL_BOSS_|HEAL_RETREAT|DAILY_POLICY|BUILD4_|CHARACTER|ATTACK_BIAS|PEPE_)/;
const UPGRADE_PROFILES = ['build4', 'combat', 'offense', 'defense', 'xp', 'leveraged', 'glass'];

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function pick(rng, values) { return values[Math.floor(rng() * values.length)]; }
function uniqueVariants(count, seed) {
  const rng = random(seed);
  const variants = [];
  const seen = new Set();
  const add = (v) => {
    const key = JSON.stringify({ env: v.env, upgrade: v.upgrade, character: v.character || 'pepe' });
    if (!seen.has(key)) { seen.add(key); variants.push(v); }
  };
  const base = {
    DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003',
    DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', CRATE_ATTRACTION: '0.02',
    BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02',
    BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55',
    HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0',
  };
  add({ name: 'known-best-baseline', env: base, upgrade: 'build4', character: 'pepe' });
  add({ name: 'known-best-bull', env: base, upgrade: 'build4', character: 'bull' });
  add({ name: 'decoy-recover-focused', env: { ...base, XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '1.5', XP_DECOY_FORCE: '0.06', XP_RETURN_FORCE: '0.12', XP_DECOY_MIN_DISTANCE: '80', XP_DECOY_MIN_HP: '0.55', XP_DECOY_COOLDOWN: '6' }, upgrade: 'build4', character: 'pepe' });
  add({ name: 'boss-farm-priority', env: { ...base, BOSS_FARM: '1', BOSS_FARM_MIN_HP: '0.45', BOSS_FARM_RANGE: '150', BOSS_FARM_PULL: '0.025', BOSS_FARM_TANGENT: '0.45' }, upgrade: 'build4', character: 'pepe' });
  add({ name: 'late-final-boss-900', env: { ...base, FINAL_BOSS_CHIP_START: '840', FINAL_BOSS_ENGAGE_AT: '900', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30' }, upgrade: 'build4', character: 'pepe' });
  add({ name: 'high-offense', env: { ...base, BOSS_BUDGET_FACTOR: '0.2', HEAL_RETREAT_START: '0.4', DAILY_THREAT_RADIUS: '48', DAILY_PROJECTILE_MULT: '2' }, upgrade: 'offense', character: 'pepe' });

  const choose = (list) => pick(rng, list).toString();
  const ranges = {
    DAILY_THREAT_RADIUS: [0, 8, 15, 22, 28, 35, 45, 55, 65, 70, 80, 95, 115, 140],
    DAILY_PROJECTILE_MULT: [0, 0.1, 0.35, 0.5, 0.75, 1.5, 2.5, 3.5, 4.5, 6, 8, 11],
    DAILY_DRIFT: [0, 0.0005, 0.0015, 0.003, 0.006, 0.012, 0.025, 0.05],
    DAILY_XP_TARGET_RANGE: [150, 220, 300, 420, 550, 750],
    DAILY_XP_CROWD_LIMIT: [0, 1, 2, 3, 4],
    DAILY_XP_ATTRACTION: [0.003, 0.006, 0.012, 0.02, 0.04, 0.08],
    XP_POST_DROP_START: [120, 180, 240, 300, 420, 600],
    CRATE_ATTRACTION: [0, 0.006, 0.012, 0.02, 0.035, 0.055],
    CRATE_MAX_CROWD: [1, 2, 3, 4, 6],
    BOSS_SOFT_RANGE: [120, 160, 200, 220, 260, 320],
    BOSS_SOFT_PULL: [0.001, 0.003, 0.006, 0.012, 0.02, 0.035],
    BOSS_BUDGET_FACTOR: [0.15, 0.22, 0.3, 0.35, 0.45, 0.55, 0.7],
    BOSS_FARM_MIN_HP: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85],
    BOSS_FARM_RANGE: [100, 130, 160, 190, 230, 280],
    BOSS_FARM_PULL: [0.005, 0.01, 0.02, 0.035, 0.06],
    BOSS_FARM_TANGENT: [0.15, 0.3, 0.45, 0.65, 0.85],
    HEAL_RETREAT_START: [0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8],
    HEAL_RETREAT_EXIT: [0.65, 0.72, 0.8, 0.86, 0.92, 0.98],
    XP_DECOY_CROWD: [0, 1, 2, 3, 4, 5, 7],
    XP_DECOY_SECONDS: [0.25, 0.5, 0.8, 1, 1.5, 2, 3, 4.5],
    XP_DECOY_FORCE: [0.008, 0.015, 0.025, 0.04, 0.06, 0.09, 0.14, 0.2],
    XP_RETURN_FORCE: [0.015, 0.03, 0.045, 0.06, 0.09, 0.14, 0.22, 0.35],
    XP_DECOY_MIN_DISTANCE: [40, 70, 100, 140, 180, 240, 320],
    XP_DECOY_MIN_HP: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85],
    XP_DECOY_COOLDOWN: [2, 4, 7, 10, 15, 25],
    XP_DECOY_AWAY_WEIGHT: [0.25, 0.5, 1, 1.5, 2.5, 4, 6, 8],
    XP_DECOY_THREAT_WEIGHT: [0, 0.2, 0.35, 0.6, 1, 1.5, 2],
    FINAL_BOSS_ENGAGE_AT: [840, 870, 900, 930, 960, 990, 1020, 1080, 1120, 1140, 1160, 1170, 1180, 1190],
    FINAL_BOSS_LATEST_ENGAGE_AT: [1140, 1170, 1180, 1190, 1195, 1198, 3000],
    FINAL_BOSS_CHIP_START: [780, 840, 900, 960, 1020, 1080, 1110, 1140, 1170, 100000],
    FINAL_BOSS_HOLD_RANGE: [450, 650, 850, 1100, 1500, 2000, 2800],
    FINAL_BOSS_KILL_WINDOW: [18, 24, 30, 40, 55],
    FINAL_BOSS_RANGE_FACTOR: [0.4, 0.55, 0.72, 0.9, 1.2],
    FINAL_BOSS_RANGE_CAP: [120, 180, 260, 400, 600],
    FINAL_BOSS_RADIAL_PULL: [0.004, 0.008, 0.012, 0.02, 0.035, 0.055],
    FINAL_BOSS_TANGENT: [0.1, 0.2, 0.35, 0.5, 0.7, 0.9],
    FINAL_BOSS_HOLD_PULL: [0.03, 0.05, 0.08, 0.12, 0.2, 0.3],
    FINAL_BOSS_HOLD_TANGENT: [0.05, 0.1, 0.18, 0.28, 0.42, 0.6],
    FINAL_BOSS_DPS_FACTOR: [0.3, 0.4, 0.55, 0.7, 0.9, 1.2],
    FINAL_BOSS_MIN_REMAINING_HP: [200, 400, 600, 800, 1200, 1800],
  };
  const seedFile = process.env.SEARCH_SEEDS_FILE;
  const templates = seedFile ? readFileSync(seedFile, 'utf8').split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(row => row?.env && row?.upgrade).sort((a, b) => b.score - a.score).slice(0, 40) : [];
  const mutateFromTemplate = (template, index) => {
    const env = { ...template.env };
    for (const key of ['XP_DECOY', 'HEAL_RETREAT', 'BOSS_FARM', 'BOSS_FARM_BLEND', 'FINAL_BOSS_ATTACK_BLEND', 'FINAL_BOSS_HOLD_BLEND']) {
      if (rng() < 0.2) env[key] = choose(['0', '1']);
    }
    const available = Object.keys(ranges);
    const mutationCount = 1 + Math.floor(rng() * 5);
    for (let n = 0; n < mutationCount; n++) {
      const key = pick(rng, available);
      const values = ranges[key];
      const oldValue = Number(env[key]);
      if (!Number.isFinite(oldValue)) {
        env[key] = choose(values);
        continue;
      }
      const near = values.map(Number).sort((a, b) => Math.abs(a - oldValue) - Math.abs(b - oldValue));
      const choices = near.slice(0, Math.min(4, near.length));
      env[key] = String(pick(rng, choices));
    }
    if (env.FINAL_BOSS_ENGAGE_AT) {
      const engage = Number(env.FINAL_BOSS_ENGAGE_AT);
      if (env.FINAL_BOSS_CHIP_START) env.FINAL_BOSS_CHIP_START = String(Math.min(engage, Number(env.FINAL_BOSS_CHIP_START)));
      if (env.FINAL_BOSS_LATEST_ENGAGE_AT) env.FINAL_BOSS_LATEST_ENGAGE_AT = String(Math.max(engage, Number(env.FINAL_BOSS_LATEST_ENGAGE_AT)));
    }
    const upgrade = rng() < 0.65 ? template.upgrade : pick(rng, UPGRADE_PROFILES);
    let character = template.character || 'pepe';
    if (rng() < 0.2) character = character === 'pepe' ? 'bull' : 'pepe';
    if (process.env.SEARCH_DECOY_ONLY === '1') {
      env.XP_DECOY = '1';
      env.XP_DECOY_CROWD = choose([0, 1, 2]);
    }
    if (process.env.SEARCH_EARLY_FINAL_BOSS === '1') {
      const engage = Number(choose([780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1180, 1190]));
      env.FINAL_BOSS_ENGAGE_AT = String(engage);
      env.FINAL_BOSS_CHIP_START = choose(ranges.FINAL_BOSS_CHIP_START.filter(value => Number(value) <= engage));
      env.FINAL_BOSS_LATEST_ENGAGE_AT = String(engage);
      env.FINAL_BOSS_KILL_WINDOW = choose([30, 40, 55, 70, 90]);
      env.FINAL_BOSS_HOLD_BLEND = choose(['0', '1']);
      env.FINAL_BOSS_ATTACK_BLEND = choose(['0', '1']);
    }
    return { name: `mut-${index + 1}-from-${template.name}`, env, upgrade, character };
  };
  if (process.env.SEARCH_FINAL_BOSS_GRID === '1') {
    const engagements = [990, 1000, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1080];
    bossGrid: for (const template of templates.slice(0, 12)) {
      const upgradeProfiles = process.env.SEARCH_GRID_UPGRADES === '1' ? UPGRADE_PROFILES : [template.upgrade];
      for (const engage of engagements) {
        for (const attackBlend of ['0', '1']) {
          for (const holdBlend of ['0', '1']) {
            for (const killWindow of ['30', '55', '90']) {
              for (const upgrade of upgradeProfiles) {
                if (variants.length >= count) break bossGrid;
                const env = {
                  ...template.env,
                  XP_DECOY: '1',
                  XP_DECOY_CROWD: '0',
                  FINAL_BOSS_ENGAGE_AT: String(engage),
                  FINAL_BOSS_CHIP_START: String(Math.max(720, engage - 90)),
                  FINAL_BOSS_LATEST_ENGAGE_AT: String(engage),
                  FINAL_BOSS_KILL_WINDOW: killWindow,
                  FINAL_BOSS_ATTACK_BLEND: attackBlend,
                  FINAL_BOSS_HOLD_BLEND: holdBlend,
                };
                add({ name: `boss-grid-${template.name}-${engage}-${attackBlend}-${holdBlend}-${killWindow}-${upgrade}`, env, upgrade, character: template.character || 'pepe' });
              }
            }
          }
        }
      }
    }
  }
  for (let i = 0; variants.length < count; i++) {
    if (templates.length && rng() < 0.8) {
      add(mutateFromTemplate(pick(rng, templates), i));
      continue;
    }
    const env = { ...base };
    for (const key of ['DAILY_THREAT_RADIUS', 'DAILY_PROJECTILE_MULT', 'DAILY_DRIFT', 'DAILY_XP_TARGET_RANGE', 'DAILY_XP_CROWD_LIMIT', 'DAILY_XP_ATTRACTION', 'XP_POST_DROP_START', 'CRATE_ATTRACTION', 'CRATE_MAX_CROWD', 'BOSS_SOFT_RANGE', 'BOSS_SOFT_PULL', 'BOSS_BUDGET_FACTOR', 'FINAL_BOSS_RANGE_FACTOR', 'FINAL_BOSS_RANGE_CAP', 'FINAL_BOSS_RADIAL_PULL', 'FINAL_BOSS_TANGENT', 'FINAL_BOSS_HOLD_PULL', 'FINAL_BOSS_HOLD_TANGENT', 'FINAL_BOSS_DPS_FACTOR', 'FINAL_BOSS_MIN_REMAINING_HP']) env[key] = choose(ranges[key]);
    env.HEAL_RETREAT = choose(['0', '1']);
    env.HEAL_RETREAT_START = choose(ranges.HEAL_RETREAT_START);
    env.HEAL_RETREAT_EXIT = choose(ranges.HEAL_RETREAT_EXIT);
    env.BOSS_FARM = choose(['0', '1']);
    env.BOSS_FARM_BLEND = choose(['0', '1']);
    env.FINAL_BOSS_ATTACK_BLEND = choose(['0', '1']);
    for (const key of ['BOSS_FARM_MIN_HP', 'BOSS_FARM_RANGE', 'BOSS_FARM_PULL', 'BOSS_FARM_TANGENT']) env[key] = choose(ranges[key]);
    env.XP_DECOY = choose(['0', '1']);
    for (const key of ['XP_DECOY_CROWD', 'XP_DECOY_SECONDS', 'XP_DECOY_FORCE', 'XP_RETURN_FORCE', 'XP_DECOY_MIN_DISTANCE', 'XP_DECOY_MIN_HP', 'XP_DECOY_COOLDOWN']) env[key] = choose(ranges[key]);
    for (const key of ['XP_DECOY_AWAY_WEIGHT', 'XP_DECOY_THREAT_WEIGHT']) env[key] = choose(ranges[key]);
    const engage = Number(choose(ranges.FINAL_BOSS_ENGAGE_AT));
    if (rng() < 0.68) {
      env.FINAL_BOSS_ENGAGE_AT = String(engage);
      env.FINAL_BOSS_CHIP_START = choose(ranges.FINAL_BOSS_CHIP_START.filter(value => Number(value) <= engage));
      env.FINAL_BOSS_LATEST_ENGAGE_AT = choose(ranges.FINAL_BOSS_LATEST_ENGAGE_AT.filter(value => Number(value) >= engage));
      env.FINAL_BOSS_HOLD_RANGE = choose(ranges.FINAL_BOSS_HOLD_RANGE);
      env.FINAL_BOSS_KILL_WINDOW = choose(ranges.FINAL_BOSS_KILL_WINDOW);
      env.FINAL_BOSS_HOLD_BLEND = choose(['0', '1']);
    } else {
      delete env.FINAL_BOSS_ENGAGE_AT;
      delete env.FINAL_BOSS_CHIP_START;
      delete env.FINAL_BOSS_LATEST_ENGAGE_AT;
      delete env.FINAL_BOSS_HOLD_RANGE;
      delete env.FINAL_BOSS_KILL_WINDOW;
    }
    if (process.env.SEARCH_DECOY_ONLY === '1') {
      env.XP_DECOY = '1';
      env.XP_DECOY_CROWD = choose([0, 1, 2]);
    }
    if (process.env.SEARCH_EARLY_FINAL_BOSS === '1') {
      const earlyEngage = Number(choose([780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1180, 1190]));
      env.FINAL_BOSS_ENGAGE_AT = String(earlyEngage);
      env.FINAL_BOSS_CHIP_START = choose(ranges.FINAL_BOSS_CHIP_START.filter(value => Number(value) <= earlyEngage));
      env.FINAL_BOSS_LATEST_ENGAGE_AT = String(earlyEngage);
      env.FINAL_BOSS_KILL_WINDOW = choose([30, 40, 55, 70, 90]);
      env.FINAL_BOSS_HOLD_BLEND = choose(['0', '1']);
      env.FINAL_BOSS_ATTACK_BLEND = choose(['0', '1']);
    }
    const upgrade = pick(rng, UPGRADE_PROFILES);
    const character = pick(rng, ['pepe', 'pepe', 'pepe', 'bull']);
    add({ name: `random-${i + 1}`, env, upgrade, character });
  }
  return variants;
}

function selectUpgrade(sim, profile) {
  if (profile === 'build4') return chooseBuild4Upgrade(sim);
  return chooseBuild4Profile(sim, profile);
}

function runVariant(variant, verify = false) {
  for (const key of Object.keys(process.env)) if (STRATEGY_KEYS.test(key) || PHYSICS_OVERRIDES.test(key)) delete process.env[key];
  for (const [key, value] of Object.entries(variant.env)) process.env[key] = String(value);
  const character = variant.character || 'pepe';
  process.env.CHARACTER = character;
  const sim = new Simulation({ seed: LIVE.seed, twist: LIVE.twist, character });
  const bot = createBot({ style: 'daily', phase: -1 });
  sim.botMove = state => bot.move(state);
  const recorder = verify ? new RunRecorder(LIVE.seed, LIVE.twist, character) : null;
  let finalBossKillTime = null;
  while (!sim.over) {
    if (sim.choices) {
      const index = selectUpgrade(sim, variant.upgrade);
      recorder?.pick(sim.tick, index);
      sim.choose(index);
      continue;
    }
    const code = bot.move(sim);
    recorder?.tick(code);
    sim.step(code);
    for (const event of sim.drainEvents()) if (event.t === 'bossDown' && event.id === 'bear_market') finalBossKillTime = sim.time;
  }
  const summary = sim.summary();
  const checked = recorder ? replay(recorder.toBytes()) : null;
  return {
    name: variant.name, upgrade: variant.upgrade, character, score: summary.score, ticks: summary.ticks,
    timeMs: summary.timeMs, reason: summary.reason, won: summary.won, kills: summary.kills,
    bossKills: summary.bossKills, level: summary.level, scoreBreakdown: summary.scoreBreakdown,
    xpCollected: summary.telemetry?.xpCollected, xpExpired: summary.telemetry?.xpExpired,
    bossDamage: summary.telemetry?.bossDamage, bossDamageById: summary.telemetry?.bossDamageById,
    damageDealt: summary.telemetry?.damageDealt, weaponEvolutions: summary.weaponEvolutions,
    crates: summary.crates, controller: bot.diagnostics, finalBossKillTime,
    env: variant.env, hash: sim.stateHash(),
    replay: checked ? { ok: checked.ok, hash: checked.hash, score: checked.summary?.score, reason: checked.summary?.reason } : undefined,
  };
}

if (!isMainThread) {
  LIVE = workerData.challenge;
  for (const variant of workerData.variants) {
    try { parentPort.postMessage({ result: runVariant(variant) }); }
    catch (error) { parentPort.postMessage({ error: error.stack, name: variant.name }); }
  }
  parentPort.close();
} else {
  const forbidden = Object.keys(process.env).filter(k => PHYSICS_OVERRIDES.test(k));
  if (forbidden.length) throw new Error(`Physics overrides are forbidden: ${forbidden.join(', ')}`);
  const response = await fetch('https://bearproof.app/api/daily');
  if (!response.ok) throw new Error(`GET /api/daily failed: ${response.status}`);
  const daily = await response.json();
  if (Number(daily.build) !== 4 || !Number.isInteger(daily.seed) || !daily.twist?.id || !daily.date) {
    throw new Error(`Expected a valid daily Build 4 contract, got ${JSON.stringify(daily)}`);
  }
  LIVE = Object.freeze({ date: daily.date, seed: daily.seed, twist: daily.twist.id, stage: daily.stage });
  const count = Number(process.env.SEARCH_COUNT || 1000);
  const seed = Number(process.env.SEARCH_SEED || 20260926);
  const workerCount = Math.max(1, Math.min(Number(process.env.SEARCH_WORKERS || Math.min(5, cpus().length)), count));
  const variants = uniqueVariants(count, seed);
  const buckets = Array.from({ length: workerCount }, () => []);
  variants.forEach((variant, index) => buckets[index % workerCount].push(variant));
  const output = process.env.SEARCH_OUTPUT || '/tmp/build4-thousands.jsonl';
  writeFileSync(output, '');
  let finished = 0, best = -Infinity;
  const started = Date.now();
  await Promise.all(buckets.map((batch, index) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { variants: batch, challenge: LIVE }, execArgv: [] });
    worker.on('message', message => {
      if (message.result) {
        const r = message.result;
        appendFileSync(output, `${JSON.stringify(r)}\n`);
        finished++;
        if (r.score > best) { best = r.score; console.error(`BEST ${finished}/${count}: ${r.name} ${r.score} ${r.reason} ${r.bossKills} bosses (${((Date.now()-started)/1000).toFixed(0)}s)`); }
        if (finished % 25 === 0) console.error(`Progress ${finished}/${count}; best=${best}; elapsed=${((Date.now()-started)/1000).toFixed(0)}s`);
        if (r.score >= Number(process.env.SEARCH_TARGET || 322000)) console.error(`TARGET REACHED by ${r.name}: ${r.score}`);
      } else if (message.error) {
        appendFileSync(output, `${JSON.stringify(message)}\n`);
        console.error(`ERROR ${message.name}: ${message.error}`);
      }
    });
    worker.on('error', reject);
    worker.on('exit', code => code === 0 ? resolve() : reject(new Error(`worker ${index} exited ${code}`)));
  })));
  const results = (await (await import('node:fs/promises')).readFile(output, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse).filter(r => Number.isFinite(r.score)).sort((a,b) => b.score-a.score);
  const verifiedTop = [];
  for (const result of results.slice(0, 5)) {
    const variant = variants.find(item => item.name === result.name);
    const checked = runVariant(variant, true);
    verifiedTop.push({ name: checked.name, score: checked.score, ticks: checked.ticks, reason: checked.reason, bossKills: checked.bossKills, hash: checked.hash, replay: checked.replay, matchesSearch: checked.hash === result.hash && checked.score === result.score });
  }
  console.log(JSON.stringify({ challenge: LIVE, searchSeed: seed, variants: variants.length, workers: workerCount, elapsedSeconds: (Date.now()-started)/1000, top: results.slice(0, 10).map(({name,character,score,ticks,reason,bossKills,kills,level,finalBossKillTime,upgrade,controller,hash,scoreBreakdown,env})=>({name,character,score,ticks,reason,bossKills,kills,level,finalBossKillTime,upgrade,controller,hash,scoreBreakdown,env})), verifiedTop, output }));
}
