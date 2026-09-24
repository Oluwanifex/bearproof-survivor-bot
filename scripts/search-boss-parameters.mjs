import { spawnSync } from 'node:child_process';
const rows = [];
for (const budget of [0.55, 0.6, 0.65, 0.7, 0.75]) for (const range of [0.62, 0.68, 0.72, 0.76, 0.82]) {
  const env = { ...process.env, BOSS_BUDGET_FACTOR: String(budget), BOSS_RANGE_FACTOR: String(range) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ budget, range, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, finalBossDamage: r.telemetry?.bossDamageById?.bear_market || 0, reason: r.reason, hash: r.hash });
  console.error(JSON.stringify(rows.at(-1)));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 10), all: rows }, null, 2));
