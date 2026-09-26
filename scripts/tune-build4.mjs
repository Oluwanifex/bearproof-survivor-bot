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
  { name: 'pepe-gravity-once', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02' }, upgrades: { gravityOnce: true, heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-decoy-return', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.06', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { gravityOnce: true, heal: 0.82, dca: 180, hedge: 155, cold: 140, thick: 140, slip: 130, hf: 155, conv: 105, alpha: 75, liq: 60, decay: 7 } },
  { name: 'pepe-manual-combo', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.06', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { userBuild: true, heal: 0.82 } },
  { name: 'pepe-manual-combo-heal85', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.06', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { userBuild: true, gravityOnce: true, heal: 0.85 } },
  { name: 'pepe-manual-combo-dca', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.06', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { userBuild: true, focusDca: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-manual-dca-nodecoy', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { userBuild: true, focusDca: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-best-retreat', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat60', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.60', HEAL_RETREAT_EXIT: '0.84', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat55', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat50', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.50', HEAL_RETREAT_EXIT: '0.84', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat52', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.52', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat57', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.57', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-crates3', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-crates4', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '4', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-attack', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { fastAttack: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-retreat55-damagebuild', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { damageBuild: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-retreat55-attackcore', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { attackCore: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-retreat55-boss50', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.50', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-boss35', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'bull-retreat55-boss35', character: 'bull', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-boss-farm', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', BOSS_FARM: '1', BOSS_FARM_MIN_HP: '0.72', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-boss-farm-lower', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', BOSS_FARM: '1', BOSS_FARM_MIN_HP: '0.50', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-evolution', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { evolutionBuild: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-retreat55-green-evolution', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { targetEvolve: true, heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-combat', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { combatBuild: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-retreat55-hedged-leverage', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0' }, upgrades: { hedgedLeverage: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-retreat55-delay900', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '780', FINAL_BOSS_ENGAGE_AT: '900', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay900-hold1200', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '780', FINAL_BOSS_ENGAGE_AT: '900', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '1200', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay900-hold1600', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '780', FINAL_BOSS_ENGAGE_AT: '900', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '1600', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay900-hold2000', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '780', FINAL_BOSS_ENGAGE_AT: '900', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '2000', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-chip1080-engage1140-hold2000', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '1080', FINAL_BOSS_ENGAGE_AT: '1140', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '2000', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-chip1080-engage1170-hold2000', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '1080', FINAL_BOSS_ENGAGE_AT: '1170', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '2000', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-chip1140-engage1170-hold2000', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '1140', FINAL_BOSS_ENGAGE_AT: '1170', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '2000', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay960', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '840', FINAL_BOSS_ENGAGE_AT: '960', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay1020', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '900', FINAL_BOSS_ENGAGE_AT: '1020', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay1080', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '960', FINAL_BOSS_ENGAGE_AT: '1080', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-delay1110', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', BOSS_BUDGET_FACTOR: '0.35', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '0', FINAL_BOSS_CHIP_START: '990', FINAL_BOSS_ENGAGE_AT: '1110', FINAL_BOSS_LATEST_ENGAGE_AT: '1170', FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat65', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.65', HEAL_RETREAT_EXIT: '0.90', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-best-retreat70', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.70', HEAL_RETREAT_EXIT: '0.92', XP_DECOY: '0' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-manual-retreat60', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.06', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.60', HEAL_RETREAT_EXIT: '0.84', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { userBuild: true, gravityOnce: true, heal: 0.82 } },
  { name: 'pepe-best-decoy', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.06' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-decoy-careful', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '1', XP_DECOY_CROWD: '5', XP_DECOY_SECONDS: '2', XP_DECOY_MIN_DISTANCE: '160', XP_DECOY_COOLDOWN: '15', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.08' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-retreat55-decoy-short', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.02', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.55', HEAL_RETREAT_EXIT: '0.86', XP_DECOY: '1', XP_DECOY_CROWD: '4', XP_DECOY_SECONDS: '1', XP_DECOY_MIN_DISTANCE: '150', XP_DECOY_COOLDOWN: '10', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.08' }, upgrades: { heal: 0.82, dca: 180, hedge: 155, cold: 145, thick: 145, slip: 130, hf: 145, conv: 95, alpha: 80, liq: 65, decay: 7 } },
  { name: 'pepe-decoy-return-long', character: 'pepe', movement: { DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.003', CRATE_ATTRACTION: '0.035', CRATE_MAX_CROWD: '3', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '5', XP_DECOY_FORCE: '0.035', XP_RETURN_FORCE: '0.08', HEAL_RETREAT: '1', HEAL_RETREAT_START: '0.42', HEAL_RETREAT_EXIT: '0.72', BOSS_SOFT: '1', BOSS_SOFT_RANGE: '220', BOSS_SOFT_PULL: '0.02' }, upgrades: { gravityOnce: true, heal: 0.82, dca: 180, hedge: 155, cold: 140, thick: 140, slip: 130, hf: 155, conv: 105, alpha: 75, liq: 60, decay: 7 } },
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
  if (card.kind === 'heal') {
    if ((policy.evolutionBuild || policy.combatBuild) && hp < 0.55) return 7000;
    return hp < policy.heal ? 1000 : 0;
  }
  if (card.kind === 'passive') {
    const count = p.passives[card.id]?.count || 0;
    if (count >= SIM.PASSIVE_MAX_STACK) return -1000;
    if (policy.combatBuild) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      const weights = { high_frequency: 620, conviction: 560, hedge: 520, dca: 490, slippage: 440, thick_skin: 400, cold_wallet: 380, alpha: 350, compounding: 250, liquidity: 220 };
      const caps = { high_frequency: 3, conviction: 2, hedge: 2, dca: 2, slippage: 1, thick_skin: 1, cold_wallet: 1, alpha: 1, compounding: 1, liquidity: 1 };
      if (card.id in weights) {
        if (count >= caps[card.id]) return -250;
        return weights[card.id] - count * 95
          + (hp < 0.70 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 130 : 0);
      }
      return -100;
    }
    if (policy.hedgedLeverage) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      if (card.id === 'leverage') {
        const hedges = p.passives.hedge?.count || 0;
        return count === 0 && hedges >= 2 && sim.time >= 240 ? 520 : -500;
      }
      const weights = { hedge: count < 3 ? 335 : 140, dca: count < 2 ? 270 : 110, high_frequency: count < 3 ? 250 : 125, conviction: count < 2 ? 245 : 115, slippage: count < 2 ? 225 : 110, thick_skin: count < 2 ? 210 : 105, cold_wallet: count < 2 ? 185 : 90, alpha: 170, compounding: 125, liquidity: 100 };
      return (weights[card.id] ?? -150) - count * 35
        + (hp < 0.70 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 130 : 0);
    }
    if (policy.evolutionBuild) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      const weights = { high_frequency: 420, conviction: 360, hedge: 345, dca: 325, slippage: 300, cold_wallet: 280, thick_skin: 260, alpha: 220, liquidity: 150, compounding: 120 };
      return (weights[card.id] ?? -200) - count * 36
        + (hp < 0.68 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 80 : 0);
    }
    if (policy.fastAttack) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      const weights = { high_frequency: 850, conviction: 790, hedge: 760, dca: 720, slippage: 700, cold_wallet: 680, thick_skin: 650, alpha: 620, liquidity: 590, compounding: 570 };
      return (weights[card.id] ?? -100) - count * (card.id === 'high_frequency' ? 100 : 80)
        + (hp < 0.68 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 140 : 0);
    }
    if (policy.attackCore) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      const weights = { high_frequency: 1360, conviction: 1250, hedge: 1120, dca: 1080, slippage: 980, cold_wallet: 900, thick_skin: 880 };
      const caps = { high_frequency: 2, conviction: 2, hedge: 2, dca: 2, slippage: 2, cold_wallet: 1, thick_skin: 1 };
      if (card.id in weights) {
        if (count >= caps[card.id]) return -300;
        return weights[card.id] - count * 260
          + (hp < 0.68 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 160 : 0);
      }
      return -200;
    }
    if (policy.damageBuild) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      const weights = { dca: 1760, hedge: 1640, high_frequency: 1520, conviction: 1470, slippage: 1390, cold_wallet: 1280, thick_skin: 1240, alpha: 1100, liquidity: 960, compounding: 900 };
      const caps = { dca: 2, hedge: 2, high_frequency: 3, conviction: 3, slippage: 2, cold_wallet: 2, thick_skin: 1, alpha: 2, liquidity: 1, compounding: 1 };
      if (card.id in weights) {
        if (count >= caps[card.id]) return -300;
        return weights[card.id] - count * 250
          + (hp < 0.72 && ['dca', 'hedge', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 180 : 0);
      }
      return -200;
    }
    if (policy.userBuild) {
      if (policy.gravityOnce && card.id === 'whale_gravity') return count === 0 && sim.time < 180 ? 3000 : -700;
      if (policy.focusDca) {
        if ((p.passives.whale_gravity?.count || 0) === 0 && sim.time < 180 && card.id === 'whale_gravity') return 3000;
        if ((p.passives.dca?.count || 0) === 0 && card.id === 'dca') return 2850;
        const priorities = {
          whale_gravity: -700,
          dca: count === 0 ? 900 : 500 - count * 120,
          hedge: count === 0 ? 2050 : 1500 - count * 90,
          high_frequency: 1900 - count * 120,
          conviction: 1800 - count * 110,
          slippage: 1650 - count * 90,
          thick_skin: 1550 - count * 90,
          cold_wallet: 1450 - count * 90,
        };
        return (priorities[card.id] ?? -150)
          + (hp < 0.68 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 45 : 0);
      }
      const weights = {
        high_frequency: 225, conviction: 200, hedge: 190, dca: 185,
        slippage: 175, thick_skin: 165, cold_wallet: 155,
        whale_gravity: count === 0 && sim.time < 180 ? 240 : -500,
      };
      return (weights[card.id] ?? -150) - count * (card.id === 'whale_gravity' ? 0 : 18)
        + (hp < 0.68 && ['hedge', 'dca', 'slippage', 'thick_skin', 'cold_wallet'].includes(card.id) ? 45 : 0);
    }
    if (policy.gravityOnce && card.id === 'whale_gravity') {
      return count === 0 && sim.time < 180 ? 3000 : -700;
    }
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
    if (policy.targetEvolve) {
      if (card.evolves) return 5000 + (weaponValue[card.id] ?? 50);
      if (current && card.id === 'green_candle' && current.level >= 2 && current.level < 5) return 2500 + current.level * 100;
      if (current && card.id === 'circuit_breaker' && current.level >= 3 && current.level < 5) return 2200 + current.level * 100;
    }
    if (policy.combatBuild) {
      const values = { buyback: 180, tongue: 170, laser_eyes: 160, diamond_hands: 145, circuit_breaker: 140, green_candle: 130, airdrop: 105, dead_cat_bounce: 95, hopium: 70, limit_order: 55, horns: 40 };
      return (card.evolves ? 5000 : 0) + (current ? 520 + current.level * 38 : 480) + (values[card.id] ?? 0);
    }
    if (policy.evolutionBuild) {
      const values = { buyback: 150, laser_eyes: 145, tongue: 140, diamond_hands: 130, green_candle: 120, circuit_breaker: 110, airdrop: 70, dead_cat_bounce: 55, hopium: 35, limit_order: 20, horns: 10 };
      return (card.evolves ? 5000 : 0) + (current ? 650 + current.level * 50 : 420) + (values[card.id] ?? 0);
    }
    if (policy.userBuild) {
      const values = { buyback: 330, tongue: 275, laser_eyes: 260, circuit_breaker: 245, diamond_hands: 235, airdrop: 220, green_candle: 205, dead_cat_bounce: 190, hopium: 160, limit_order: 145, horns: 125 };
      return (card.evolves ? 1000 : 0) + (current ? 220 + current.level * 28 : 600) + (values[card.id] ?? 100);
    }
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
    variant: variant.name, ...s, crates: sim.stats.crates, crateLoot: sim.stats.crateLoot,
    weaponEvolutions: sim.player.weapons.filter((weapon) => weapon.isEvolved()).map((weapon) => weapon.id),
    damageByWeapon: sim.stats.damageByWeapon,
    bossDamageById: sim.stats.bossDamageById,
    replayBytes: log.length, hash,
    replay: { ok: replayResult.ok, hash: replayResult.hash, score: replayResult.summary?.score, reason: replayResult.summary?.reason },
  };
}
function runVariant(variant) {
  for (const key of Object.keys(process.env)) {
    if (/^(DAILY_|LATE_|XP_|CRATE_|BOSS_|FINAL_BOSS_|FIRE_RATE_|SPREAD_|HEAL_RETREAT)/.test(key)
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
  let crateDrops = 0;
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
    for (const event of sim.drainEvents()) if (event.t === 'crateDrop') crateDrops++;
  }
  const log = recorder.toBytes();
  if (process.env.WRITE_LOG) writeFileSync(process.env.WRITE_LOG, Buffer.from(log));
  const checked = replay(log);
  return { ...summarize(sim, variant, checked, sim.stateHash(), log), crateDrops, controller: bot.diagnostics };
}

const baseSelected = process.env.TUNE_ONLY
  ? variants.filter((variant) => process.env.TUNE_ONLY.split(',').includes(variant.name))
  : variants;
if (!baseSelected.length) throw new Error(`No tuner variants matched ${process.env.TUNE_ONLY}`);
const bossFactors = process.env.BOSS_FACTOR_SWEEP
  ? process.env.BOSS_FACTOR_SWEEP.split(',').map(Number)
  : [];
if (bossFactors.some((factor) => !Number.isFinite(factor) || factor <= 0 || factor > 1)) {
  throw new Error('BOSS_FACTOR_SWEEP values must be finite numbers in (0, 1].');
}
const bossEngageTimes = process.env.BOSS_ENGAGE_SWEEP
  ? process.env.BOSS_ENGAGE_SWEEP.split(',').map(Number)
  : [];
if (bossEngageTimes.some((time) => !Number.isInteger(time) || time < 720 || time > 1170)) {
  throw new Error('BOSS_ENGAGE_SWEEP values must be integer seconds from 720 through 1170.');
}
const threatRadii = process.env.THREAT_RADIUS_SWEEP
  ? process.env.THREAT_RADIUS_SWEEP.split(',').map(Number)
  : [];
if (threatRadii.some((radius) => !Number.isFinite(radius) || radius < 20 || radius > 200)) {
  throw new Error('THREAT_RADIUS_SWEEP values must be finite movement radii from 20 through 200.');
}
const xpAttractions = process.env.XP_ATTRACTION_SWEEP
  ? process.env.XP_ATTRACTION_SWEEP.split(',').map(Number)
  : [];
if (xpAttractions.some((value) => !Number.isFinite(value) || value < 0 || value > 0.2)) {
  throw new Error('XP_ATTRACTION_SWEEP values must be finite strategy values from 0 through 0.2.');
}
const xpRanges = process.env.XP_RANGE_SWEEP
  ? process.env.XP_RANGE_SWEEP.split(',').map(Number)
  : [];
if (xpRanges.some((value) => !Number.isFinite(value) || value < 100 || value > 1000)) {
  throw new Error('XP_RANGE_SWEEP values must be finite target ranges from 100 through 1000.');
}
const driftValues = process.env.DRIFT_SWEEP
  ? process.env.DRIFT_SWEEP.split(',').map(Number)
  : [];
if (driftValues.some((value) => !Number.isFinite(value) || value < 0 || value > 0.1)) {
  throw new Error('DRIFT_SWEEP values must be finite strategy values from 0 through 0.1.');
}
const projectileValues = process.env.PROJECTILE_SWEEP
  ? process.env.PROJECTILE_SWEEP.split(',').map(Number)
  : [];
if (projectileValues.some((value) => !Number.isFinite(value) || value < 0 || value > 20)) {
  throw new Error('PROJECTILE_SWEEP values must be finite strategy values from 0 through 20.');
}
const factors = bossFactors.length ? bossFactors : [null];
const engageTimes = bossEngageTimes.length ? bossEngageTimes : [null];
const radii = threatRadii.length ? threatRadii : [null];
const attractions = xpAttractions.length ? xpAttractions : [null];
const targetRanges = xpRanges.length ? xpRanges : [null];
const drifts = driftValues.length ? driftValues : [null];
const projectiles = projectileValues.length ? projectileValues : [null];
const selected = bossFactors.length || bossEngageTimes.length || threatRadii.length || xpAttractions.length || xpRanges.length || driftValues.length || projectileValues.length
  ? baseSelected.flatMap((variant) => factors.flatMap((factor) => engageTimes.flatMap((engageAt) => radii.flatMap((radius) => attractions.flatMap((attraction) => targetRanges.flatMap((targetRange) => drifts.flatMap((drift) => projectiles.map((projectile) => {
      const movement = { ...variant.movement };
      const nameParts = [variant.name];
      if (factor !== null) {
        movement.BOSS_BUDGET_FACTOR = String(factor);
        nameParts.push(`boss-factor-${factor}`);
      }
      if (engageAt !== null) {
        movement.FINAL_BOSS_CHIP_START = String(Math.max(720, engageAt - 90));
        movement.FINAL_BOSS_ENGAGE_AT = String(engageAt);
        movement.FINAL_BOSS_LATEST_ENGAGE_AT = '1170';
        movement.FINAL_BOSS_HOLD_RANGE ??= '850';
        nameParts.push(`engage-${engageAt}`);
      }
      if (radius !== null) {
        movement.DAILY_THREAT_RADIUS = String(radius);
        nameParts.push(`threat-${radius}`);
      }
      if (attraction !== null) {
        movement.DAILY_XP_ATTRACTION = String(attraction);
        nameParts.push(`xp-attraction-${attraction}`);
      }
      if (targetRange !== null) {
        movement.DAILY_XP_TARGET_RANGE = String(targetRange);
        nameParts.push(`xp-range-${targetRange}`);
      }
      if (drift !== null) {
        movement.DAILY_DRIFT = String(drift);
        nameParts.push(`drift-${drift}`);
      }
      if (projectile !== null) {
        movement.DAILY_PROJECTILE_MULT = String(projectile);
        nameParts.push(`projectile-${projectile}`);
      }
      return { ...variant, name: nameParts.join('-'), movement };
    }))))))))
  : baseSelected;
for (const variant of selected) console.log(JSON.stringify(runVariant(variant)));
