import { spawnSync } from 'node:child_process';
const rows = [];
for (const ticks of [78000, 79200, 80400, 81600, 82800, 84000, 85200]) for (const enemy of [1, 2, 3, 4]) for (const projectile of [3, 5, 8]) {
  const env = { ...process.env, MAX_TICKS: String(ticks), FARM_AFTER_WIN: '1', FARM_ENEMY_WEIGHT: String(enemy), FARM_BOSS_WEIGHT: '5', FARM_PROJECTILE_WEIGHT: String(projectile) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { ticks, enemy, projectile, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash };
  rows.push(row);
  if (row.score >= 225000) console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 25), all: rows }, null, 2));
