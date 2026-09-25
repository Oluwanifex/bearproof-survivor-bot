import { spawnSync } from 'node:child_process';
const rows = [];
const base = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5' };
const weapons = ['laser_eyes', 'buyback', 'circuit_breaker', 'airdrop', 'diamond_hands', 'horns'];
for (const weapon of weapons) {
  for (const rate of [0.45, 0.6, 0.75, 0.9, 1.0]) {
    const env = { ...base, [`FIRE_RATE_${weapon.toUpperCase()}`]: String(rate) };
    const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
    const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
    if (!line) continue;
    const r = JSON.parse(line);
    rows.push({ kind: 'rate', weapon, rate, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, reason: r.reason, hash: r.hash });
  }
}
for (const spread of [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]) {
  const env = { ...base, SPREAD_LASER_EYES: String(spread) };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ kind: 'spread', weapon: 'laser_eyes', spread, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, reason: r.reason, hash: r.hash });
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
