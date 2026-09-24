import { spawnSync } from 'node:child_process';
const rows = [];
for (const radius of [64, 68, 70, 72, 76]) for (const projectile of [3.8, 4.2, 4.5, 4.8, 5.2]) for (const xp of [0.009, 0.012, 0.015]) {
  const env = { ...process.env, DAILY_THREAT_RADIUS: String(radius), DAILY_PROJECTILE_MULT: String(projectile), DAILY_XP_ATTRACTION: String(xp), DAILY_DRIFT: '0.0015' };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { radius, projectile, xp, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, finalBossDamage: r.telemetry?.bossDamageById?.bear_market || 0, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 15), all: rows }, null, 2));
