import { spawnSync } from 'node:child_process';
const rows = [];
for (const magnet of [1, 1.25, 1.5]) for (const target of [240, 300, 360]) for (const crowd of [0, 1]) for (const threat of [55, 70]) for (const projectile of [3.5, 4.5, 6]) for (const drift of [0.001, 0.0015]) {
  const env = { ...process.env, XP_MAGNET_MULT: String(magnet), XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: String(crowd), DAILY_THREAT_RADIUS: String(threat), DAILY_PROJECTILE_MULT: String(projectile), DAILY_DRIFT: String(drift), DAILY_XP_ATTRACTION: '0.012' };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { magnet, target, crowd, threat, projectile, drift, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, damageTaken: r.telemetry?.damageTaken, hash: r.hash };
  rows.push(row);
  if (row.score >= 190000) console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
