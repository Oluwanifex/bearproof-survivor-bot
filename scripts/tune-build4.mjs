import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { Simulation, SIM_VERSION } from '../src/sim/sim.js';
import { SIM } from '../src/sim/content.js';
import { createBot } from '../src/sim/bot.js';
import { RunRecorder, replay } from '../src/sim/runlog.js';
import { dailyTwistForSeed } from '../src/sim/content.js';
import { encodeMove, MOVE_TABLE } from '../src/sim/input-codes.js';

const dailyResponse = await fetch('https://bearproof.app/api/daily');
if (!dailyResponse.ok) throw new Error(`GET /api/daily failed: ${dailyResponse.status}`);
const daily = await dailyResponse.json();
if (!Number.isInteger(daily.seed) || !daily.twist?.id || !daily.date || daily.build !== 4) {
  throw new Error(`Expected today's Build 4 challenge, received ${JSON.stringify(daily)}`);
}
if (daily.twist.id !== dailyTwistForSeed(daily.seed)) {
  throw new Error('Daily twist does not match the deterministic Build 4 seed mapping');
}
const forbiddenPhysicsOverrides = Object.keys(process.env).filter((key) =>
  /^(WEAPON_COOLDOWN_MULT|FIRE_RATE_|WEAPON_SPREAD_MULT|SPREAD_|PLAYER_SPEED_MULT|ENEMY_SPEED_MULT|PLAYER_DAMAGE_MULT|ENEMY_HP_MULT|ENEMY_DMG_MULT|SPAWN_MULT|XP_MULT|MAX_TICKS|TICK_RATE|SIM_)/.test(key)
);
if (forbiddenPhysicsOverrides.length) {
  throw new Error(`Unset physics override variables before tuning: ${forbiddenPhysicsOverrides.join(', ')}`);
}

const variants = [
  { name: 'bull-balanced', character: 'bull', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', CRATE_ATTRACTION: '0.02' }, upgrades: { heal: 0.78, dca: 165, hedge: 155, cold: 145, thick: 140, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'bull-sustain', character: 'bull', movement: { DAILY_THREAT_RADIUS: '90', DAILY_PROJECTILE_MULT: '6', DAILY_DRIFT: '0.008', CRATE_ATTRACTION: '0.04' }, upgrades: { heal: 0.85, dca: 220, hedge: 175, cold: 165, thick: 160, slip: 145, hf: 130, conv: 80, alpha: 65, liq: 55, decay: 10 } },
  { name: 'bull-offense', character: 'bull', movement: { DAILY_THREAT_RADIUS: '55', DAILY_PROJECTILE_MULT: '5', DAILY_DRIFT: '0.012', CRATE_ATTRACTION: '0.025' }, upgrades: { heal: 0.76, dca: 145, hedge: 125, cold: 115, thick: 110, slip: 105, hf: 190, conv: 150, alpha: 130, liq: 100, decay: 6 } },
  { name: 'pepe-balanced', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-boss-soft-150', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '150', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-boss-soft-220', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-heal-90', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.90, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-heal-95', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.95, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-heal-99', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.99, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-hedge-slippage', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 175, hedge: 280, cold: 120, thick: 165, slip: 210, hf: 140, conv: 60, alpha: 40, liq: 30, whale: -80, compounding: 15, decay: 7 } },
  { name: 'pepe-hedge-tank', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 320, cold: 185, thick: 220, slip: 180, hf: 120, conv: 50, alpha: 50, liq: 20, whale: -80, compounding: -20, decay: 9 } },
  { name: 'pepe-defensive-core', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { defensiveCore: true, heal: 0.62 } },
  { name: 'pepe-threat150-drift008', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '150', DAILY_PROJECTILE_MULT: '7', DAILY_DRIFT: '0.008', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-threat90-drift02', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '90', DAILY_PROJECTILE_MULT: '7', DAILY_DRIFT: '0.02', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-bossrange300', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '300', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-drift020', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.2', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-drift050', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-drift100', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '1', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-final-900', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', FINAL_BOSS_CHIP_START: '820', FINAL_BOSS_ENGAGE_AT: '900', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30', FINAL_BOSS_INCOMING_FACTOR: '0.8', FINAL_BOSS_DPS_FACTOR: '0.55' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-final-1020', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', FINAL_BOSS_CHIP_START: '940', FINAL_BOSS_ENGAGE_AT: '1020', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30', FINAL_BOSS_INCOMING_FACTOR: '0.8', FINAL_BOSS_DPS_FACTOR: '0.55' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-no-boss-seek', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-boss-seek-hp98', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '90', DAILY_PROJECTILE_MULT: '6', DAILY_DRIFT: '0.004', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_SOFT_MIN_HP: '0.98' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-defense6', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { defenseSet: true, heal: 0.82 } },
  { name: 'pepe-tank', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '80', DAILY_PROJECTILE_MULT: '5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { tank: true, heal: 0.7 } },
  { name: 'pepe-pure-tank', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '90', DAILY_PROJECTILE_MULT: '6', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02' }, upgrades: { pureTank: true, heal: 0.82 } },
  { name: 'pepe-weapons', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { weaponSet: true, heal: 0.55 } },
  { name: 'pepe-square-10s', character: 'pepe', motion: { kind: 'square', segmentTicks: 600 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-square-5s', character: 'pepe', motion: { kind: 'square', segmentTicks: 300 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-square-10s-third', character: 'pepe', motion: { kind: 'square', segmentTicks: 600, magnitude: 0.34 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-square-10s-two-thirds', character: 'pepe', motion: { kind: 'square', segmentTicks: 600, magnitude: 0.67 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-square-15s-third', character: 'pepe', motion: { kind: 'square', segmentTicks: 900, magnitude: 0.34 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-east', character: 'pepe', motion: { kind: 'fixed', dx: 1, dy: 0 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-orbit-250', character: 'pepe', motion: { kind: 'orbit', radius: 250, aiWeight: 0.35 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-orbit-500', character: 'pepe', motion: { kind: 'orbit', radius: 500, aiWeight: 0.35 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-orbit-850', character: 'pepe', motion: { kind: 'orbit', radius: 850, aiWeight: 0.35 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-orbit-1200', character: 'pepe', motion: { kind: 'orbit', radius: 1200, aiWeight: 0.35 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-orbit-1800', character: 'pepe', motion: { kind: 'orbit', radius: 1800, aiWeight: 0.35 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-kite180', character: 'pepe', motion: { kind: 'kite', radius: 180, aiWeight: 0.55 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-kite260', character: 'pepe', motion: { kind: 'kite', radius: 260, aiWeight: 0.55 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-kite350', character: 'pepe', motion: { kind: 'kite', radius: 350, aiWeight: 0.55 }, movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-sustain', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '95', DAILY_PROJECTILE_MULT: '6', DAILY_DRIFT: '0.008', CRATE_ATTRACTION: '0.04' }, upgrades: { heal: 0.88, dca: 220, hedge: 180, cold: 170, thick: 165, slip: 145, hf: 125, conv: 75, alpha: 65, liq: 55, decay: 10 } },
  { name: 'pepe-offense', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '55', DAILY_PROJECTILE_MULT: '5', DAILY_DRIFT: '0.012', CRATE_ATTRACTION: '0.025' }, upgrades: { heal: 0.76, dca: 145, hedge: 125, cold: 115, thick: 110, slip: 105, hf: 190, conv: 150, alpha: 130, liq: 100, decay: 6 } },
];
const weaponValue = { tongue: 165, diamond_hands: 155, laser_eyes: 155, buyback: 145, airdrop: 135, dead_cat_bounce: 125, green_candle: 115, circuit_breaker: 105, hopium: 90, limit_order: 80, horns: 70 };
function cardScore(card, sim, policy) {
  const p = sim.player;
  const hp = p.hp / Math.max(1, p.maxHp);
  if (card.kind === 'heal') return hp < policy.heal ? 1000 : 0;
  if (card.kind === 'passive') {
    const count = p.passives[card.id]?.count || 0;
    if (count >= SIM.PASSIVE_MAX_STACK) return -1000;
    if (policy.weaponSet) return card.id === 'high_frequency' ? 35 - count * 4 : -40;
    if (policy.defenseSet) {
      const priority = { dca: 230, hedge: 220, cold_wallet: 205, thick_skin: 200, slippage: 185, high_frequency: 170 };
      return priority[card.id] === undefined ? -700 : count === 0 ? priority[card.id] + 80 : priority[card.id] - count * 32;
    }
    if (policy.tank) {
      const priority = { hedge: 560, slippage: 520, dca: 500, thick_skin: 450, cold_wallet: 430, high_frequency: 180, conviction: 130 };
      return priority[card.id] === undefined ? 0 : priority[card.id] - count * 15 + (count === 0 ? 45 : 0);
    }
    if (policy.pureTank) {
      const priority = { hedge: 1600, slippage: 1590, dca: 1580, thick_skin: 1570, cold_wallet: 1560 };
      return priority[card.id] === undefined ? -100 : priority[card.id] - count * 20;
    }
    if (policy.defensiveCore) {
      const core = { hedge: 550, slippage: 535, thick_skin: 515, cold_wallet: 495, dca: 480 };
      if (core[card.id] !== undefined) return count === 0 ? 2400 + core[card.id] : 1750 + core[card.id] - count * 18;
      if (card.id === 'high_frequency') return 500 - count * 30;
      return -100;
    }
    const weights = {
      dca: policy.dca, hedge: policy.hedge, cold_wallet: policy.cold,
      thick_skin: policy.thick, slippage: policy.slip, high_frequency: policy.hf,
      conviction: policy.conv, alpha: policy.alpha, liquidity: policy.liq,
      whale_gravity: policy.whale ?? (sim.time < 240 ? 115 : 5),
      compounding: policy.compounding ?? (sim.time < 360 ? 90 : 10), momentum: 35, leverage: -250,
    };
    return (weights[card.id] ?? 10) - count * policy.decay
      + (hp < 0.72 && ['dca', 'hedge', 'cold_wallet', 'thick_skin', 'slippage'].includes(card.id) ? 40 : 0);
  }
  if (card.kind === 'weapon') {
    const current = p.weapons.find((weapon) => weapon.id === card.id);
    if (!current && p.weapons.length >= SIM.MAX_WEAPONS) return -1000;
    if (policy.defensiveCore) return (card.evolves ? 2600 : 0) + (current ? 300 + current.level * 22 : 850) + (weaponValue[card.id] ?? 50);
    if (policy.weaponSet) {
      const values = { tongue: 190, laser_eyes: 180, buyback: 170, circuit_breaker: 160, diamond_hands: 150, green_candle: 140 };
      if (!(card.id in values)) return -500;
      return (card.evolves ? 1000 : 0) + (current ? 220 + current.level * 30 : 600) + values[card.id];
    }
    if (policy.tank && !current) return 420 + (weaponValue[card.id] ?? 50);
    if (policy.tank && card.evolves) return 800;
    return (card.evolves ? 500 : 0) + (current ? 75 + current.level * 12 : 125)
      + (weaponValue[card.id] ?? 50);
  }
  return -100;
}
function summarize(sim, variant, replayResult, hash, log) {
  if (!replayResult.ok) throw new Error(`${variant.name}: replay failed: ${replayResult.error}`);
  if (replayResult.hash !== hash || replayResult.summary.score !== sim.stats.score) {
    throw new Error(`${variant.name}: replay result differs from captured run (${replayResult.hash}/${replayResult.summary.score} vs ${hash}/${sim.stats.score})`);
  }
  if (sim.tick > SIM.MAX_TICKS) throw new Error(`${variant.name}: exceeded the official ${SIM.MAX_TICKS}-tick cap`);
  const s = sim.summary();
  return {
    date: daily.date, build: daily.build, stage: daily.stage, seed: daily.seed,
    twist: daily.twist.id, simVersion: SIM_VERSION, physicsOverrides: 'none',
    variant: variant.name, ...s, crates: sim.stats.crates,
    damageByWeapon: sim.stats.damageByWeapon,
    bossDamageById: sim.stats.bossDamageById,
    replayBytes: log.length, hash,
    replay: { ok: replayResult.ok, hash: replayResult.hash, score: replayResult.summary?.score, reason: replayResult.summary?.reason },
  };
}
function runVariant(variant) {
  for (const key of Object.keys(process.env)) {
    if (/^(DAILY_|LATE_|XP_|CRATE_|BOSS_|FINAL_BOSS_|FIRE_RATE_|SPREAD_)/.test(key)
      || ['WEAPON_COOLDOWN_MULT', 'WEAPON_SPREAD_MULT', 'USE_PLANNER', 'CHOICE_OVERRIDE', 'CHARACTER'].includes(key)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, variant.movement, { CHARACTER: variant.character });
  const sim = new Simulation({ seed: daily.seed, twist: daily.twist.id, character: variant.character });
  const bot = createBot({ style: 'daily', phase: -1 });
  let motionTick = 0;
  const getMove = (state) => {
    const base = bot.move(state);
    if (!variant.motion) return base;
    motionTick++;
    let dx = variant.motion.dx || 0;
    let dy = variant.motion.dy || 0;
    let aiWeight = 0.2;
    if (variant.motion.kind === 'square') {
      const dir = Math.floor(motionTick / variant.motion.segmentTicks) % 4;
      [[dx, dy]] = [[1, 0], [0, 1], [-1, 0], [0, -1]].slice(dir, dir + 1);
    }
    if (variant.motion.kind === 'orbit') {
      const px = state.player.x;
      const py = state.player.y;
      const radius = Math.hypot(px, py);
      const ux = radius > 1e-6 ? px / radius : Math.cos(motionTick / 100);
      const uy = radius > 1e-6 ? py / radius : Math.sin(motionTick / 100);
      const radial = -(radius - variant.motion.radius) * 0.004;
      dx = -uy + ux * radial;
      dy = ux + uy * radial;
      const closeCount = state.enemies.filter((enemy) => (enemy.x - px) ** 2 + (enemy.y - py) ** 2 < 160 ** 2).length;
      const nearCount = state.enemies.filter((enemy) => (enemy.x - px) ** 2 + (enemy.y - py) ** 2 < 300 ** 2).length;
      aiWeight = closeCount > 0 ? 0.88 : nearCount > 2 ? 0.62 : variant.motion.aiWeight;
    }
    if (variant.motion.kind === 'kite') {
      const target = state.enemies.filter((enemy) => !enemy.boss).reduce((best, enemy) => {
        const d2 = (enemy.x - state.player.x) ** 2 + (enemy.y - state.player.y) ** 2;
        return d2 < best.d2 ? { enemy, d2 } : best;
      }, { enemy: null, d2: Infinity }).enemy;
      if (target) {
        const vx = target.x - state.player.x;
        const vy = target.y - state.player.y;
        const distance = Math.hypot(vx, vy) || 1;
        const ux = vx / distance;
        const uy = vy / distance;
        const radial = (distance - variant.motion.radius) * 0.006;
        dx = -uy + ux * radial;
        dy = ux + uy * radial;
        aiWeight = variant.motion.aiWeight;
      }
    }
    const [bx, by] = MOVE_TABLE[base] || [0, 0];
    const crate = state.crates?.some((item) => (item.x - state.player.x) ** 2 + (item.y - state.player.y) ** 2 < 240 ** 2);
    if (crate && state.enemies.filter((enemy) => (enemy.x - state.player.x) ** 2 + (enemy.y - state.player.y) ** 2 < 180 ** 2).length < 2) aiWeight = Math.max(aiWeight, 0.75);
    const magnitude = variant.motion.magnitude ?? 1;
    return encodeMove(dx * magnitude * (1 - aiWeight) + bx * aiWeight, dy * magnitude * (1 - aiWeight) + by * aiWeight);
  };
  sim.botMove = getMove;
  const recorder = new RunRecorder(daily.seed, daily.twist.id, variant.character);
  while (!sim.over) {
    if (sim.choices) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      sim.choices.forEach((card, index) => {
        const value = cardScore(card, sim, variant.upgrades);
        if (value > bestScore) { bestScore = value; bestIndex = index; }
      });
      recorder.pick(sim.tick, bestIndex);
      sim.choose(bestIndex);
      continue;
    }
    const code = getMove(sim);
    recorder.tick(code);
    sim.step(code);
    sim.drainEvents();
  }
  const log = recorder.toBytes();
  if (process.env.WRITE_LOG) writeFileSync(process.env.WRITE_LOG, Buffer.from(log));
  const checked = replay(log);
  return summarize(sim, variant, checked, sim.stateHash(), log);
}

const selected = process.env.TUNE_ONLY
  ? variants.filter((variant) => process.env.TUNE_ONLY.split(',').includes(variant.name))
  : variants;
if (!selected.length) throw new Error(`No tuner variants matched ${process.env.TUNE_ONLY}`);
for (const variant of selected) console.log(JSON.stringify(runVariant(variant)));
