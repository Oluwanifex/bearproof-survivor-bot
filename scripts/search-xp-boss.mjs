import { spawnSync } from 'node:child_process';
const rows = [];
for (const budget of [0.55, 0.6, 0.65, 0.7, 0.75]) for (const range of [0.55, 0.65, 0.72, 0.8, 0.9, 1]) {
  const env = { ...process.env, XP_MAGNET_MULT: '1.5', XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: '420', DAILY_XP_CROWD_LIMIT: '1', DAILY_XP_ATTRACTION: '0.012', CHOICE_OVERRIDE: '26:2', BOSS_BUDGET_FACTOR: String(budget), BOSS_RANGE_FACTOR: String(range) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { budget, range, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, finalBossDamage: r.telemetry?.bossDamageById?.bear_market || 0, xpCollected: r.telemetry?.xpCollected, xpExpired: r.telemetry?.xpExpired, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 15), all: rows }, null, 2));
