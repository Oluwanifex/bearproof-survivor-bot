import { spawnSync } from 'node:child_process';
const rows = [];
for (const ticks of [85200, 86400, 87600, 88800, 90000, 93600, 97200, 100800]) for (const enemy of [2, 3, 4, 5, 6, 8]) for (const projectile of [3, 5, 7, 9]) {
  const env = { ...process.env, MAX_TICKS: String(ticks), FARM_AFTER_WIN: '1', FARM_ENEMY_WEIGHT: String(enemy), FARM_BOSS_WEIGHT: '5', FARM_PROJECTILE_WEIGHT: String(projectile) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { ticks, enemy, projectile, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, won: r.won, reason: r.reason, damageTaken: r.telemetry?.damageTaken, hash: r.hash };
  rows.push(row);
  if (row.score >= 255000) console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
