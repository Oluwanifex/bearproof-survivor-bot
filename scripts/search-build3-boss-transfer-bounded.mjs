import { spawnSync } from 'node:child_process';
const rows = [];
const base = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5' };
for (const budget of [0.5, 0.65, 0.8, 1.0]) for (const range of [0.6, 0.72, 0.85]) for (const cap of [180, 240, 300]) for (const tangent of [0.5, 0.8]) {
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env: { ...base, BOSS_BUDGET_FACTOR: String(budget), BOSS_RANGE_FACTOR: String(range), BOSS_RANGE_CAP: String(cap), BOSS_TANGENT: String(tangent), BOSS_RADIAL_PULL: '0.012' }, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ budget, range, cap, tangent, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, bossDamage: r.telemetry?.bossDamage, hash: r.hash });
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
