import test from 'node:test';
import assert from 'node:assert/strict';
import { SIM } from '../src/sim/content.js';
import { decodeRunLog } from '../src/sim/runlog.js';
import { Simulation, SIM_VERSION } from '../src/sim/sim.js';
import { BuildPlanner, marginalWeaponDps } from '../src/sim/planner.js';

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
