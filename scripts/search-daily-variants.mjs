import { runBot } from '../run-bot.mjs';
const seed = 4144142827;
const rows = [];
for (const style of ['daily', 'survive']) {
  for (const phase of [-30, -20, -15, -10, -5, -2, -1, 0, 1, 2, 5, 10, 15, 20, 30]) {
    const run = runBot(seed, { mode: 'daily', twist: 'high_volatility', style, phase });
    rows.push({ style, phase, score: run.summary.score, timeMs: run.summary.timeMs, kills: run.summary.kills, bossKills: run.summary.bossKills, reason: run.summary.reason, xpExpired: run.summary.telemetry.xpExpired, xpSpawned: run.summary.telemetry.xpSpawned, hash: run.hash });
    console.error(JSON.stringify(rows.at(-1)));
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ seed, best: rows.slice(0, 10), all: rows }, null, 2));
