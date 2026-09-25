import { spawnSync } from 'node:child_process';
const rows = [];
for (const defense of [0, 10, 20, 35, 50, 70]) {
  for (const until of [300, 480, 660, 840, 960]) {
    for (const threat of [65, 75, 85]) {
      const env = { ...process.env, CHARACTER: 'pepe', PEPE_DEFENSE_BIAS: String(defense), PEPE_DEFENSE_UNTIL: String(until), DAILY_THREAT_RADIUS: String(threat), DAILY_PROJECTILE_MULT: '2', DAILY_DRIFT: '0.003', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0' };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ defense, until, threat, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 25), all: rows }, null, 2));
