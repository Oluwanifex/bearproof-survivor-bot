import { spawnSync } from 'node:child_process';
const rows = [];
for (const threat of [60, 75, 90, 105, 120]) {
  for (const projectile of [2, 3.5, 5, 7]) {
    for (const drift of [0, 0.0015, 0.003]) {
      const env = { ...process.env, CHARACTER: 'pepe', DAILY_THREAT_RADIUS: String(threat), DAILY_PROJECTILE_MULT: String(projectile), DAILY_DRIFT: String(drift), DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0' };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ threat, projectile, drift, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
