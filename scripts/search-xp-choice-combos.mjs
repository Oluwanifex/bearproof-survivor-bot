import { spawnSync } from 'node:child_process';
const rows = [];
for (const level of [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30]) for (const index of [0, 1, 2]) {
  const env = { ...process.env, XP_MAGNET_MULT: '1.5', XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: '420', DAILY_XP_CROWD_LIMIT: '1', DAILY_XP_ATTRACTION: '0.012', CHOICE_OVERRIDE: `26:2,${level}:${index}` };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { fixed: '26:2', level, index, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, xpSpawned: r.telemetry?.xpSpawned, xpCollected: r.telemetry?.xpCollected, xpExpired: r.telemetry?.xpExpired, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
