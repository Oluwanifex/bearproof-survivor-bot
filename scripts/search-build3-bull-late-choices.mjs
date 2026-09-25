import { spawnSync } from 'node:child_process';
const rows = [];
const base = { ...process.env, CHARACTER: 'bull', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0' };
for (const level of [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35]) {
  for (const index of [0, 1, 2]) {
    const env = { ...base, CHOICE_OVERRIDE: `28:2,${level}:${index}` };
    const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
    const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
    if (!line) continue;
    const r = JSON.parse(line);
    rows.push({ level, index, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, levelEnd: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
