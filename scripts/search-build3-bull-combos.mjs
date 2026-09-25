import { spawnSync } from 'node:child_process';
const overrides = ['', '15:0', '19:1', '28:2', '15:0,19:1', '15:0,28:2', '19:1,28:2', '15:0,19:1,28:2', '15:0,19:1,28:2,26:1', '15:0,19:1,28:2,26:2'];
const rows = [];
for (const choice of overrides) {
  for (const crowd of [2, 3]) {
    for (const seconds of [2.5, 3, 3.5]) {
      const env = { ...process.env, CHARACTER: 'bull', CHOICE_OVERRIDE: choice, XP_DECOY: '1', XP_DECOY_CROWD: String(crowd), XP_DECOY_SECONDS: String(seconds), XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0' };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ choice, crowd, seconds, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash, weapons: r.weapons, passives: r.passives });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
