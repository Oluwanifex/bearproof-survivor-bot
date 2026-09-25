import { spawnSync } from 'node:child_process';
const rows = [];
for (const attack of [0, 10, 20, 30, 45, 60, 80, 110]) {
  for (const start of [0, 240, 480, 720, 960]) {
    for (const minHp of [0.5, 0.62, 0.75]) {
      const env = { ...process.env, CHARACTER: 'bull', ATTACK_BIAS: String(attack), ATTACK_BIAS_START: String(start), ATTACK_BIAS_MIN_HP: String(minHp), DEFENSE_BIAS: '0',
        XP_DECOY: '1', XP_DECOY_CROWD: '3', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045',
        DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0' };
      const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
      const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
      if (!line) continue;
      const r = JSON.parse(line);
      rows.push({ attack, start, minHp, score: r.score, ticks: r.ticks, timeMs: r.timeMs, kills: r.kills, level: r.level, bossKills: r.bossKills, won: r.won, reason: r.reason, hash: r.hash });
    }
  }
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 30), all: rows }, null, 2));
