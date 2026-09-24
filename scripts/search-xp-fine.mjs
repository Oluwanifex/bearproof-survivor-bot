import { spawnSync } from 'node:child_process';
const rows = [];
for (const magnet of [1.25, 1.4, 1.5, 1.6, 1.75]) for (const target of [300, 360, 420, 480, 540]) for (const crowd of [0, 1, 2]) for (const attraction of [0.009, 0.011, 0.012, 0.013, 0.015]) {
  const env = { ...process.env, XP_MAGNET_MULT: String(magnet), XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: String(crowd), DAILY_XP_ATTRACTION: String(attraction), CHOICE_OVERRIDE: '26:2,33:1' };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { magnet, target, crowd, attraction, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, xpCollected: r.telemetry?.xpCollected, xpExpired: r.telemetry?.xpExpired, hash: r.hash };
  rows.push(row);
  if (row.score >= 190000) console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
