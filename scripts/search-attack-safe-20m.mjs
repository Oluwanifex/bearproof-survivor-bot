import { spawnSync } from 'node:child_process';
const rows = [];
for (const bias of [8, 16, 24, 32, 40]) for (const start of [480, 600, 720, 900]) for (const hp of [0.55, 0.62, 0.7]) {
  const env = { ...process.env, MAX_TICKS: '72000', FARM_AFTER_WIN: '0', ATTACK_BIAS: String(bias), ATTACK_BIAS_START: String(start), ATTACK_BIAS_MIN_HP: String(hp), XP_MAGNET_MULT: '1.25', XP_MAGNET_START: '300', XP_POST_DROP: '1', XP_POST_DROP_START: '300', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012' };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { bias, start, hp, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, damageTaken: r.telemetry?.damageTaken, hash: r.hash };
  rows.push(row);
  if (row.score >= 215000) console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 20), all: rows }, null, 2));
