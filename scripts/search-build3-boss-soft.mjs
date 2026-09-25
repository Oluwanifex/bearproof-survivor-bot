import { spawnSync } from 'node:child_process';
const rows = [];
const windows = ['', '300-380,450-530,600-690', '300-420,450-570,600-700'];
const base = { ...process.env, CHARACTER: 'bull', BOSS_SOFT: '1', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5', BOSS_SOFT_TANGENT: '0.25' };
for (const w of windows) for (const minHp of [0.65, 0.75, 0.85]) for (const range of [150, 180, 210]) for (const pull of [0.0008, 0.0015, 0.003, 0.005]) {
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env: { ...base, BOSS_FARM_WINDOWS: w, BOSS_SOFT_MIN_HP: String(minHp), BOSS_SOFT_RANGE: String(range), BOSS_SOFT_PULL: String(pull) }, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ windows: w, minHp, range, pull, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
}
rows.sort((a,b)=>b.score-a.score);
console.log(JSON.stringify({best:rows.slice(0,30),all:rows},null,2));
