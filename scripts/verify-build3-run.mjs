import { runBot } from '../run-bot.mjs';
import { replay } from '../src/sim/runlog.js';

const character = process.env.CHARACTER || 'bull';
const seed = 4144142827;
process.env.CHARACTER = character;
process.env.CHOICE_OVERRIDE ||= '27:1,28:2,29:2';
process.env.XP_DECOY ||= '1';
process.env.XP_DECOY_CROWD ||= '2';
process.env.XP_DECOY_SECONDS ||= '3';
process.env.XP_DECOY_FORCE ||= '0.025';
process.env.XP_RETURN_FORCE ||= '0.045';
process.env.DAILY_THREAT_RADIUS ||= '70';
process.env.DAILY_PROJECTILE_MULT ||= '4.5';
process.env.DAILY_DRIFT ||= '0.0015';
process.env.DAILY_XP_ATTRACTION ||= '0.012';
process.env.DAILY_XP_TARGET_RANGE ||= '300';
process.env.DAILY_XP_CROWD_LIMIT ||= '0';
process.env.LATE_SURVIVE_START ||= '1160';
process.env.LATE_THREAT_RADIUS ||= '110';
process.env.LATE_PROJECTILE_MULT ||= '4.5';
const run = runBot(seed, { mode: 'daily', twist: 'high_volatility', character, style: 'daily', phase: -1 });
const checked = replay(run.log, {});
console.log(JSON.stringify({
  character,
  seed,
  generated: { score: run.summary.score, ticks: run.summary.ticks, reason: run.summary.reason, won: run.summary.won, hash: run.hash },
  verifier: { ok: checked.ok, score: checked.summary?.score, ticks: checked.summary?.ticks, reason: checked.summary?.reason, won: checked.summary?.won, hash: checked.hash, error: checked.error || null }
}, null, 2));
