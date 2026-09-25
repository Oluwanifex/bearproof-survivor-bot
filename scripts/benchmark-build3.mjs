import { runBot } from '../run-bot.mjs';

const character = process.env.CHARACTER || 'bull';
const style = process.env.STYLE || 'daily';
const usePlanner = process.env.USE_PLANNER || '0';
const seeds = [4144142827, 1, 42, 424242, 8675309, 20260924];
for (const seed of seeds) {
  const run = runBot(seed, { mode: 'daily', twist: 'high_volatility', character, style, phase: -1 });
  const s = run.summary;
  console.log(JSON.stringify({ seed, character, style, usePlanner, score: s.score, ticks: s.ticks, timeMs: s.timeMs, kills: s.kills, level: s.level, bossKills: s.bossKills, won: s.won, reason: s.reason, weapons: s.weapons, passives: s.passives, hash: run.hash, replayBytes: run.log.length }));
}
