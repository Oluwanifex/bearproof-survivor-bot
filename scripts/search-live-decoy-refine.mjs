import { spawnSync } from 'node:child_process';
const rows = [];
const base = { ...process.env, CHARACTER: 'bull', XP_DECOY: '1', DAILY_PROJECTILE_MULT: '4.5', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_CROWD_LIMIT: '0', DAILY_DRIFT: '0.0015', DAILY_THREAT_RADIUS: '70', DAILY_XP_TARGET_RANGE: '300', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5' };
for (const gate of [0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55]) for (const seconds of [1.5, 2, 2.5, 3]) for (const force of [0.012, 0.02, 0.025, 0.035]) for (const ret of [0.025, 0.045, 0.07]) {
  const out = spawnSync(process.execPath, ['scripts/benchmark-live-2026-09-25.mjs'], { env: { ...base, XP_DECOY_MIN_HP: String(gate), XP_DECOY_CROWD: '1', XP_DECOY_SECONDS: String(seconds), XP_DECOY_FORCE: String(force), XP_RETURN_FORCE: String(ret) }, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  rows.push({ gate, seconds, force, ret, score: r.summary.score, ticks: r.summary.ticks, timeMs: r.summary.timeMs, kills: r.summary.kills, level: r.summary.level, bossKills: r.summary.bossKills, reason: r.summary.reason, hash: r.hash });
}
rows.sort((a,b)=>b.score-a.score || b.ticks-a.ticks);
console.log(JSON.stringify({best:rows.slice(0,40),all:rows},null,2));
