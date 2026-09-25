import { spawnSync } from 'node:child_process';
const rows = [];
const base = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5' };
const weapons = ['laser_eyes', 'buyback', 'circuit_breaker', 'airdrop'];
for (const rate of [0.95, 0.975, 1, 1.025, 1.05]) {
  for (const spread of [0.9, 0.95, 1, 1.05, 1.1]) {
    const env = { ...base, WEAPON_COOLDOWN_MULT: String(rate), SPREAD_LASER_EYES: String(spread) };
    const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
    const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
    if (!line) continue;
    const r = JSON.parse(line);
    rows.push({ mode: 'global', rate, spread, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, reason: r.reason, hash: r.hash });
  }
}
for (const weapon of weapons) for (const rate of [0.95, 0.975, 1.025, 1.05]) {
  const env = { ...base, [`FIRE_RATE_${weapon.toUpperCase()}`]: String(rate) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ mode: weapon, rate, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, reason: r.reason, hash: r.hash });
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
