import test from 'node:test';
import assert from 'node:assert/strict';
import { SIM } from '../src/sim/content.js';
import { decodeRunLog } from '../src/sim/runlog.js';
import { Simulation } from '../src/sim/sim.js';
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
  assert.equal(SIM.MAX_TICKS, 72_000);
  const header = new Uint8Array(14);
  header.set([0x42, 0x52, 3, 2], 0);
  new DataView(header.buffer).setUint32(10, 72_001, true);
  assert.throws(() => decodeRunLog(header), /too many ticks/);
});
