import { spawnSync } from 'node:child_process';
const rows = [];
for (const defenseBias of [0, 10, 25, 40, 60]) {
  for (const defenseUntil of [300, 600, 900]) {
    for (const attackBias of [0, 10, 20, 35]) {
      const env = { ...process.env, CHARACTER: 'pepe', PEPE_DEFENSE_BIAS: String(defenseBias), PEPE_DEFENSE_UNTIL: String(defenseUntil), ATTACK_BIAS: String(attackBias), ATTACK_BIAS_START: '600', ATTACK_BIAS_MIN_HP: '0.7', DAILY_THREAT_RADIUS: '75', DAILY_PROJECTILE_MULT: '2', DAILY_DRIFT: '0.003', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', XP_DECOY: '0' };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ defenseBias, defenseUntil, attackBias, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 25), all: rows }, null, 2));
