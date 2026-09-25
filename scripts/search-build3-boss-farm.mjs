import { spawnSync } from 'node:child_process';
const rows = [];
const base = { ...process.env, CHARACTER: 'bull', BOSS_FARM: '1', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5' };
for (const minHp of [0.55, 0.65, 0.75, 0.85]) for (const range of [120, 150, 180]) for (const tangent of [0.25, 0.45]) for (const pull of [0.012, 0.02]) {
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env: { ...base, BOSS_FARM_MIN_HP: String(minHp), BOSS_FARM_RANGE: String(range), BOSS_FARM_TANGENT: String(tangent), BOSS_FARM_PULL: String(pull) }, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ minHp, range, tangent, pull, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, bossDamage: r.telemetry?.bossDamage, hash: r.hash });
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
