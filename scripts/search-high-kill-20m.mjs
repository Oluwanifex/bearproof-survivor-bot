import { spawnSync } from 'node:child_process';
const rows = [];
for (const threat of [30, 40, 50, 60, 70, 80]) for (const projectile of [2, 3, 4.5, 6, 8]) for (const drift of [0, 0.0015, 0.003, 0.006]) for (const target of [300, 420]) {
  const env = { ...process.env, MAX_TICKS: '72000', FARM_AFTER_WIN: '0', XP_MAGNET_MULT: '1.25', XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: '0', DAILY_THREAT_RADIUS: String(threat), DAILY_PROJECTILE_MULT: String(projectile), DAILY_DRIFT: String(drift), DAILY_XP_ATTRACTION: '0.012' };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { threat, projectile, drift, target, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, damageTaken: r.telemetry?.damageTaken, hash: r.hash };
  rows.push(row);
  if (row.score >= 215000 || row.kills >= 7800) console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), highKills: rows.filter((r) => r.kills >= 7500).sort((a,b)=>b.kills-a.kills).slice(0,30), all: rows }, null, 2));
