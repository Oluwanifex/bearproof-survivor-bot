import { spawnSync } from 'node:child_process';
const rows = [];
for (const magnet of [1.25, 1.5, 2]) for (const target of [420, 600, 840]) for (const crowd of [1, 2, 3]) for (const attraction of [0.008, 0.012]) {
  const env = { ...process.env, XP_POST_DROP: '1', XP_MAGNET_MULT: String(magnet), DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: String(crowd), DAILY_XP_ATTRACTION: String(attraction) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { magnet, target, crowd, attraction, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, xpSpawned: r.telemetry?.xpSpawned, xpCollected: r.telemetry?.xpCollected, xpExpired: r.telemetry?.xpExpired, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
