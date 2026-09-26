import 'dotenv/config';
import { runBot } from './run-bot.mjs';
import { replay } from './src/sim/runlog.js';
import { SIM_VERSION } from './src/sim/sim.js';

const response = await fetch('https://bearproof.app/api/daily');
if (!response.ok) throw new Error(`GET /api/daily failed: ${response.status} ${response.statusText}`);
const daily = await response.json();
if (!Number.isInteger(daily.seed) || !daily.twist?.id || !daily.date || !Number.isInteger(Number(daily.build))) {
  throw new Error(`Unexpected daily challenge response: ${JSON.stringify(daily)}`);
}
if (Number(daily.build) !== 4) {
  throw new Error(`This simulator is pinned to Build 4; the live board is Build #${daily.build}. Refresh the official Build 4 source before running.`);
}

const physicsOverrideNames = Object.keys(process.env).filter((name) =>
  /^(WEAPON_COOLDOWN_MULT|WEAPON_SPREAD_MULT|FIRE_RATE_|SPREAD_|PLAYER_SPEED_MULT|ENEMY_SPEED_MULT|PLAYER_DAMAGE_MULT|ENEMY_HP_MULT|ENEMY_DMG_MULT|SPAWN_MULT|XP_MULT|MAX_TICKS|TICK_RATE|SIM_)/.test(name)
);
if (physicsOverrideNames.length) {
  throw new Error(`Remove physics/tick overrides before running Build 4: ${physicsOverrideNames.join(', ')}`);
}

const policyDefaults = {
  DAILY_POLICY: 'build4',
  CHARACTER: 'pepe',
  DAILY_THREAT_RADIUS: '70',
  DAILY_PROJECTILE_MULT: '4.5',
  DAILY_DRIFT: '0.003',
  CRATE_ATTRACTION: '0.02',
  BOSS_SOFT: '1',
  BOSS_SOFT_RANGE: '220',
  BOSS_SOFT_PULL: '0.02',
};
for (const [name, value] of Object.entries(policyDefaults)) process.env[name] ??= value;

const character = process.env.CHARACTER;
const options = { mode: 'daily', twist: daily.twist.id, character, style: 'daily', phase: -1 };
const first = runBot(daily.seed, options);
const verification = replay(first.log);
const second = runBot(daily.seed, options);
const reproducible = first.hash === second.hash && first.summary.score === second.summary.score;
const verified = verification.ok
  && verification.hash === first.hash
  && verification.summary.score === first.summary.score
  && first.summary.stage === daily.stage
  && verification.summary.stage === daily.stage
  && first.summary.twist === daily.twist.id;
const minimumScore = Number(process.env.MIN_DAILY_SCORE ?? 250_000);
if (!Number.isFinite(minimumScore) || minimumScore < 250_000) {
  throw new Error(`MIN_DAILY_SCORE must be at least 250000 for this requested run; received ${process.env.MIN_DAILY_SCORE}`);
}
if (!reproducible) throw new Error(`Determinism check failed: ${first.hash} != ${second.hash}`);
if (!verified) throw new Error(`Replay verification failed: ${verification.error || `${verification.hash} != ${first.hash}`}`);
const targetReached = first.summary.score >= minimumScore;
const eligibleEndReason = first.summary.reason === 'won'
  || (first.summary.reason === 'market_closed' && first.summary.ticks === 72_000);
console.log(JSON.stringify({
  date: daily.date,
  build: Number(daily.build),
  stage: daily.stage,
  seed: daily.seed,
  twist: daily.twist.id,
  twistName: daily.twist.name,
  simVersion: SIM_VERSION,
  physicsOverrides: 'none',
  policy: process.env.DAILY_POLICY,
  character,
  ...first.summary,
  replayBytes: first.log.length,
  hash: first.hash,
  validation: {
    replayOk: verification.ok,
    replayHash: verification.hash,
    reproducible,
    targetScore: minimumScore,
    targetReached,
    eligibleEndReason,
    standardTickCap: 72_000,
  },
}));
if (!eligibleEndReason) {
  throw new Error(`Run ended with ${first.summary.reason}; a submission candidate must win or reach the standard market-close tick cap.`);
}
if (!targetReached) {
  throw new Error(`Verified replay score ${first.summary.score} is below the requested ${minimumScore} target for ${daily.date}; no claim of a 250,000-point run is made.`);
}
