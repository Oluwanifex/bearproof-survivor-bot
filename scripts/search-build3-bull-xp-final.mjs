import { spawnSync } from 'node:child_process';
const rows = [];
for (const target of [180, 240, 300, 360, 420, 520]) {
  for (const attraction of [0.006, 0.009, 0.012, 0.016]) {
    for (const crowd of [1, 2, 3, 4]) {
      for (const seconds of [2, 3, 4]) {
        const env = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: String(crowd), XP_DECOY_SECONDS: String(seconds), XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: String(attraction), DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5' };
        const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
        const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
        if (!line) continue;
        const r = JSON.parse(line);
        rows.push({ target, attraction, crowd, seconds, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
      }
    }
  }
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
