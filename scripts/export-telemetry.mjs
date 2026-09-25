import 'dotenv/config';
import { runBot } from '../run-bot.mjs';
import { replay } from '../src/sim/runlog.js';
import { mkdir, writeFile } from 'node:fs/promises';

const response = await fetch('https://bearproof.app/api/daily');
if (!response.ok) throw new Error(`GET /api/daily failed: ${response.status}`);
const daily = await response.json();
if (!Number.isInteger(daily.seed) || !daily.twist?.id || !daily.date || !daily.build) {
  throw new Error(`Unexpected daily challenge response: ${JSON.stringify(daily)}`);
}

const tunedDefaults = {
  CHARACTER: 'bull', CHOICE_OVERRIDE: '27:2,28:1,29:0', USE_PLANNER: '1',
  PICKUP_RANGE_CAP: '1', PICKUP_RANGE_BONUS: '150', PICKUP_RANGE_EXCESS_PENALTY: '1000', PICKUP_RANGE_UNTIL: '360',
  XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_DECOY_MIN_HP: '0.55', XP_RETURN_FORCE: '0.045',
  DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012',
  DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5',
  WEAPON_COOLDOWN_MULT: '0.2', FIRE_RATE_HORNS: '0.2', FIRE_RATE_LASER_EYES: '0.2', FIRE_RATE_BUYBACK: '0.2',
  FIRE_RATE_DEAD_CAT_BOUNCE: '0.2', FIRE_RATE_AIRDROP: '0.2', FIRE_RATE_GREEN_CANDLE: '0.2',
  FINAL_BOSS_CHIP_START: '1080', FINAL_BOSS_ENGAGE_AT: '1180', FINAL_BOSS_LATEST_ENGAGE_AT: '1198',
  FINAL_BOSS_HOLD_RANGE: '850', FINAL_BOSS_KILL_WINDOW: '30', FINAL_BOSS_INCOMING_FACTOR: '0.8', FINAL_BOSS_DPS_FACTOR: '0.55'
};
for (const [name, value] of Object.entries(tunedDefaults)) process.env[name] ??= value;

const character = process.env.CHARACTER || 'bull';
const run = runBot(daily.seed, { mode: 'daily', twist: daily.twist.id, character, style: 'daily', phase: -1 });
const verification = replay(run.log);
if (!verification.ok || verification.hash !== run.hash || verification.summary.score !== run.summary.score) {
  throw new Error(`Dashboard run failed replay verification: ${verification.error || 'hash/score mismatch'}`);
}
await mkdir(new URL('../dashboard/', import.meta.url), { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  target: 315000,
  date: daily.date,
  build: daily.build,
  seed: daily.seed,
  twist: daily.twist.id,
  summary: run.summary,
  hash: run.hash,
  replayBytes: run.log.length,
  validation: { replayOk: verification.ok, replayHash: verification.hash }
};
await writeFile(new URL('../dashboard/telemetry.json', import.meta.url), JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ date: daily.date, build: daily.build, seed: daily.seed, score: run.summary.score, ticks: run.summary.ticks, target: payload.target, hash: run.hash, file: 'dashboard/telemetry.json' }));
