import { spawnSync } from 'node:child_process';
const rows = [];
for (const life of [1, 1.1, 1.25, 1.5, 2]) for (const level of [31, 32, 33]) for (const index of [0, 1, 2]) {
  const env = { ...process.env, XP_LIFETIME_MULT: String(life), XP_MAGNET_MULT: '1.25', XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', DAILY_XP_ATTRACTION: '0.012', CHOICE_OVERRIDE: `26:2,${level}:${index}` };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { life, level, index, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, won: r.won, reason: r.reason, xpCollected: r.telemetry?.xpCollected, xpExpired: r.telemetry?.xpExpired, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
