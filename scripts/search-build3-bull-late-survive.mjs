import { spawnSync } from 'node:child_process';
const rows = [];
for (const start of [1020, 1080, 1110, 1140, 1160]) {
  for (const threat of [75, 85, 100, 120]) {
    for (const projectile of [4.5, 5.5, 7, 9]) {
      const env = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: String(start), LATE_THREAT_RADIUS: String(threat), LATE_PROJECTILE_MULT: String(projectile) };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ start, threat, projectile, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
    }
  }
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
