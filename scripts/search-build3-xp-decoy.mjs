import { spawnSync } from 'node:child_process';
const rows = [];
for (const character of ['pepe', 'bull']) {
  for (const crowd of [3, 5, 7, 9]) {
    for (const seconds of [1, 2, 3, 4]) {
      for (const force of [0.015, 0.025, 0.04]) {
        const env = {
          ...process.env, CHARACTER: character, XP_DECOY: '1', XP_DECOY_CROWD: String(crowd), XP_DECOY_SECONDS: String(seconds), XP_DECOY_FORCE: String(force), XP_RETURN_FORCE: '0.045',
          DAILY_THREAT_RADIUS: character === 'pepe' ? '75' : '70', DAILY_PROJECTILE_MULT: character === 'pepe' ? '2' : '4.5', DAILY_DRIFT: character === 'pepe' ? '0.003' : '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0'
        };
        const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
        const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
        if (!line) continue;
        const r = JSON.parse(line);
        rows.push({ character, crowd, seconds, force, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, xpCollected: r.telemetry?.xpCollected, hash: r.hash });
      }
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
