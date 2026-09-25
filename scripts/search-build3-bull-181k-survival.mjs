import { spawnSync } from 'node:child_process';
const rows = [];
for (const threat of [55, 65, 70, 75]) {
  for (const projectile of [4, 4.5, 5, 5.5]) {
    for (const crowd of [1, 2, 3, 4]) {
      for (const seconds of [2, 2.5, 3, 3.5]) {
        const env = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: '28:2,27:1', XP_DECOY: '1', XP_DECOY_CROWD: String(crowd), XP_DECOY_SECONDS: String(seconds), XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: String(threat), DAILY_PROJECTILE_MULT: String(projectile), DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0' };
        const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
        const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
        if (!line) continue;
        const r = JSON.parse(line);
        rows.push({ threat, projectile, crowd, seconds, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
      }
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
