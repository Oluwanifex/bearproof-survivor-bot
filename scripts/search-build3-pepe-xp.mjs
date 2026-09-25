import { spawnSync } from 'node:child_process';
const rows = [];
for (const target of [180, 240, 300, 360, 420, 520]) {
  for (const crowd of [0, 1, 2]) {
    for (const attraction of [0.006, 0.012, 0.018]) {
      const env = { ...process.env, CHARACTER: 'pepe', DAILY_THREAT_RADIUS: '75', DAILY_PROJECTILE_MULT: '2', DAILY_DRIFT: '0.003', DAILY_XP_ATTRACTION: String(attraction), DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: String(crowd) };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ target, crowd, attraction, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 25), all: rows }, null, 2));
