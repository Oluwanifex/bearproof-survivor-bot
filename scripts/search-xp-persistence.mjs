import { spawnSync } from 'node:child_process';
const rows = [];
for (const life of [1.25, 1.5, 2, 3]) for (const magnet of [1.25, 1.5, 2]) for (const start of [0, 300]) for (const post of [0, 1]) {
  const env = { ...process.env, XP_LIFETIME_MULT: String(life), XP_MAGNET_MULT: String(magnet), XP_MAGNET_START: String(start), XP_POST_DROP: String(post), XP_POST_DROP_START: String(start), DAILY_XP_TARGET_RANGE: '420', DAILY_XP_CROWD_LIMIT: '1', DAILY_XP_ATTRACTION: '0.012', CHOICE_OVERRIDE: '26:2' };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { life, magnet, start, post, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, xpSpawned: r.telemetry?.xpSpawned, xpCollected: r.telemetry?.xpCollected, xpExpired: r.telemetry?.xpExpired, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
