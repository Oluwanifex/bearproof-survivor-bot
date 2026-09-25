import { spawnSync } from 'node:child_process';
const rows = [];
for (const budget of [0.35, 0.5, 0.65, 0.8, 1.0]) {
  for (const cap of [160, 200, 240, 280]) {
    for (const tangent of [0.25, 0.5, 0.75]) {
      const env = { ...process.env, CHARACTER: 'pepe', DAILY_THREAT_RADIUS: '75', DAILY_PROJECTILE_MULT: '2', DAILY_DRIFT: '0.003', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', BOSS_BUDGET_FACTOR: String(budget), BOSS_RANGE_CAP: String(cap), BOSS_TANGENT: String(tangent), BOSS_RADIAL_PULL: '0.012', XP_DECOY: '0' };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ budget, cap, tangent, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, bossDamage: r.telemetry?.bossDamage, hash: r.hash });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 25), all: rows }, null, 2));
