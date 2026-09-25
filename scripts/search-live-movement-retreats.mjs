import { spawnSync } from 'node:child_process';
const rows = [];
const seed = '3994460340';
const base = {
  ...process.env,
  CHARACTER: 'bull',
  XP_DECOY: '1',
  DAILY_PROJECTILE_MULT: '4.5',
  DAILY_XP_ATTRACTION: '0.012',
  DAILY_XP_CROWD_LIMIT: '0',
  DAILY_DRIFT: '0.0015',
  DAILY_THREAT_RADIUS: '70',
  DAILY_XP_TARGET_RANGE: '300',
  XP_DECOY_CROWD: '2',
  XP_DECOY_SECONDS: '3',
  XP_DECOY_FORCE: '0.025',
  XP_RETURN_FORCE: '0.045',
  LATE_SURVIVE_START: '1160',
  LATE_THREAT_RADIUS: '110',
  LATE_PROJECTILE_MULT: '4.5'
};
const run = (label, extra) => {
  const out = spawnSync(process.execPath, ['scripts/benchmark-live-2026-09-25.mjs'], { env: { ...base, ...extra }, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) return;
  const r = JSON.parse(line);
  rows.push({ label, ...extra, score: r.summary.score, ticks: r.summary.ticks, timeMs: r.summary.timeMs, kills: r.summary.kills, level: r.summary.level, bossKills: r.summary.bossKills, reason: r.summary.reason, xpCollected: r.summary.telemetry?.xpCollected, xpExpired: r.summary.telemetry?.xpExpired, hash: r.hash });
};
run('baseline', {});
for (const threat of [45, 55, 65, 75, 90]) for (const drift of [0.0005, 0.0015, 0.003, 0.005]) {
  run('threat-drift', { DAILY_THREAT_RADIUS: String(threat), DAILY_DRIFT: String(drift) });
}
for (const target of [180, 240, 300, 360, 420, 540]) for (const crowd of [0, 1, 2, 3]) {
  run('xp-target-crowd', { DAILY_XP_TARGET_RANGE: String(target), DAILY_XP_CROWD_LIMIT: String(crowd) });
}
for (const seconds of [1.5, 2, 2.5, 3, 4, 5]) for (const force of [0.012, 0.02, 0.025, 0.035]) for (const ret of [0.025, 0.045, 0.07]) {
  run('decoy-return', { XP_DECOY_SECONDS: String(seconds), XP_DECOY_FORCE: String(force), XP_RETURN_FORCE: String(ret) });
}
for (const gate of [0.45, 0.6, 0.75, 0.85, 0.95]) for (const crowd of [1, 2, 3, 4, 5]) {
  run('decoy-gate', { XP_DECOY_MIN_HP: String(gate), XP_DECOY_CROWD: String(crowd) });
}
rows.sort((a, b) => b.score - a.score || b.ticks - a.ticks || b.kills - a.kills);
console.log(JSON.stringify({ seed, twist: 'whale_season', stage: 'chop', best: rows.slice(0, 40), all: rows }, null, 2));
