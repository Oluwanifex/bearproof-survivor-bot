import test from 'node:test';
import assert from 'node:assert/strict';
import { SIM } from '../src/sim/content.js';
import { decodeRunLog } from '../src/sim/runlog.js';
import { Simulation, SIM_VERSION } from '../src/sim/sim.js';
import { BuildPlanner, marginalWeaponDps } from '../src/sim/planner.js';
import { chooseBuild4Profile } from '../run-bot.mjs';
import { createBot } from '../src/sim/bot.js';
import { MOVE_TABLE } from '../src/sim/input-codes.js';
import { BUILD4_TARGET_PRESET, matchesBuild4TargetPreset } from '../src/sim/build4-target-preset.js';

test('simulation clone advances deterministically without changing the source', () => {
  const sim = new Simulation({ seed: 42 });
  for (let i = 0; i < 120; i++) sim.step(0);
  const before = sim.stateHash();
  const clone = sim.clone();
  assert.equal(clone.stateHash(), before);
  clone.step(0);
  assert.equal(sim.stateHash(), before);
});

test('telemetry is present and damage is attributed by weapon', () => {
  const sim = new Simulation({ seed: 7 });
  for (let i = 0; i < 1200 && !sim.over; i++) {
    if (sim.choices) sim.choose(0);
    else sim.step(0);
  }
  const summary = sim.summary();
  assert.ok(summary.telemetry);
  assert.ok(Number.isFinite(summary.telemetry.xpSpawned));
  assert.ok(Number.isFinite(summary.telemetry.xpExpired));
  assert.ok(summary.telemetry.damageByWeapon);
  assert.ok(summary.telemetry.rangeSeconds);
});

test('planner evaluates weapon-specific marginal DPS and reserves slots', () => {
  const sim = new Simulation({ seed: 9 });
  const planner = new BuildPlanner();
  planner.update(sim);
  const card = { kind: 'weapon', id: 'laser_eyes', isNew: true, level: 1 };
  assert.ok(marginalWeaponDps(card, sim) > 0);
  assert.ok(planner.reservedWeapons.length > 0);
});

test('experimental Build 4 upgrade profiles return an offered legal card', () => {
  const sim = new Simulation({ seed: 11 });
  sim.player.passives.hedge = { count: 2 };
  sim.choices = [
    { kind: 'passive', id: 'leverage' },
    { kind: 'weapon', id: 'tongue', evolves: false },
    { kind: 'heal', id: 'heal' },
  ];
  assert.equal(chooseBuild4Profile(sim, 'leveraged'), 0);
  for (const profile of ['combat', 'offense', 'defense', 'xp', 'leveraged', 'glass']) {
    const index = chooseBuild4Profile(sim, profile);
    assert.ok(Number.isInteger(index) && index >= 0 && index < sim.choices.length, `${profile} returned ${index}`);
  }
});

test('331k Build 4 preset is restricted to its exact daily challenge contract', () => {
  const matching = {
    date: '2026-09-26', build: 4, stage: 'winter', seed: 526031759,
    twist: { id: 'flash_crash' },
  };
  assert.equal(BUILD4_TARGET_PRESET.achievedScore, 331_118);
  assert.equal(BUILD4_TARGET_PRESET.bossKills, 4);
  assert.equal(matchesBuild4TargetPreset(matching), true);
  for (const change of [
    { date: '2026-09-27' },
    { build: 3 },
    { stage: 'bull' },
    { seed: 1 },
    { twist: { id: 'different' } },
  ]) {
    assert.equal(matchesBuild4TargetPreset({ ...matching, ...change }), false);
  }
});

test('replay decoder enforces the immutable 72,000-tick build cap', () => {
  assert.equal(SIM_VERSION, 4);
  assert.equal(SIM.MAX_TICKS, 72_000);
  const header = new Uint8Array(14);
  header.set([0x42, 0x52, 3, SIM_VERSION], 0);
  new DataView(header.buffer).setUint32(10, 72_001, true);
  assert.throws(() => decodeRunLog(header), /too many ticks/);
});

test('Build 4 opening bell creates the official first-wave ring', () => {
  assert.equal(SIM.OPENING_TICK, 30);
  assert.equal(SIM.OPENING_RING, 6);
  const sim = new Simulation({ seed: 526031759, stage: 'winter', twist: 'flash_crash' });
  for (let i = 0; i < SIM.OPENING_TICK; i++) sim.step(0);
  assert.ok(sim.enemies.length >= SIM.OPENING_RING);
});

test('Build 4 scheduled supply crate opens a legal official loot effect', () => {
  assert.equal(SIM.CRATE_FIRST, 40);
  assert.equal(SIM.CRATE_EVERY, 60);
  const sim = new Simulation({ seed: 526031759, stage: 'winter', twist: 'flash_crash' });
  sim.time = SIM.CRATE_FIRST;
  sim.nextCrateAt = SIM.CRATE_FIRST;
  sim._dropCrate();
  assert.equal(sim.crates.length, 1);
  const [crate] = sim.crates;
  assert.ok(['magnet', 'shield', 'printer'].includes(crate.loot));
  sim.openCrate(crate);
  assert.equal(sim.stats.crates, 1);
  if (crate.loot === 'shield') assert.equal(sim.player.shieldTimer, 8);
  if (crate.loot === 'printer') assert.equal(sim.player.printerTimer, 10);
});

test('Build 4 state hash includes crate timing, loot, and position', () => {
  const sim = new Simulation({ seed: 526031759, stage: 'winter', twist: 'flash_crash' });
  sim.time = SIM.CRATE_FIRST;
  sim.nextCrateAt = SIM.CRATE_FIRST;
  sim._dropCrate();
  const clone = sim.clone();
  assert.equal(clone.stateHash(), sim.stateHash());
  clone.crates[0].x += 1;
  assert.notEqual(clone.stateHash(), sim.stateHash());
});

test('XP decoy deliberately draws pursuit away from the targeted orb', () => {
  const previous = {};
  const overrides = {
    XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_MIN_DISTANCE: '120',
    XP_DECOY_MIN_HP: '0.5', XP_DECOY_AWAY_WEIGHT: '4', XP_DECOY_THREAT_WEIGHT: '0',
    XP_DECOY_FORCE: '0.1', DAILY_PROJECTILE_MULT: '1', HEAL_RETREAT: '0',
  };
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    const bot = createBot({ style: 'daily' });
    const sim = {
      time: 300,
      player: { x: 0, y: 0, hp: 100, maxHp: 100, getDamageReduction: () => 0 },
      enemies: [
        { x: 50, y: 0, size: 20 }, { x: -50, y: 0, size: 20 },
        { x: 0, y: 50, size: 20 }, { x: 0, y: -50, size: 20 },
      ],
      enemyProjectiles: [],
      xp: [{ x: 200, y: 0, value: 10, life: 20, dead: false, collected: false }],
      crates: [],
      stats: { damageDealt: 0, damageTaken: 0 },
    };
    const move = bot.move(sim);
    assert.equal(bot.diagnostics.decoyStarts, 1);
    assert.ok(MOVE_TABLE[move][0] < 0, `expected movement away from XP to the east, got ${MOVE_TABLE[move]}`);
  } finally {
    for (const key of Object.keys(overrides)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
