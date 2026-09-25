import { runBot } from '../run-bot.mjs';

const seed = 3994460340;
const twist = 'whale_season';
const baseline = {
  CHARACTER: 'bull', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_DECOY_MIN_HP: '0.55', XP_RETURN_FORCE: '0.045',
  DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0',
  LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5',
  WEAPON_COOLDOWN_MULT: '0.2', FIRE_RATE_HORNS: '0.2', FIRE_RATE_LASER_EYES: '0.2', FIRE_RATE_BUYBACK: '0.2',
  FIRE_RATE_DEAD_CAT_BOUNCE: '0.2', FIRE_RATE_AIRDROP: '0.2', FIRE_RATE_GREEN_CANDLE: '0.2',
};
const rows = [];
for (let a = 0; a < 3; a += 1) {
  for (let b = 0; b < 3; b += 1) {
    for (let c = 0; c < 3; c += 1) {
      const choice = `27:${a},28:${b},29:${c}`;
      Object.assign(process.env, baseline, { CHOICE_OVERRIDE: choice });
      const run = runBot(seed, { mode: 'daily', twist, character: 'bull', style: 'daily', phase: -1 });
      const row = { sweep: 'choices-rate-0.2', choice, rate: '0.2', score: run.summary.score, ticks: run.summary.ticks, timeMs: run.summary.timeMs, kills: run.summary.kills, level: run.summary.level, bossKills: run.summary.bossKills, won: run.summary.won, reason: run.summary.reason, hash: run.hash };
      rows.push(row);
      console.error(JSON.stringify(row));
    }
  }
}
const bestChoice = rows.reduce((best, row) => row.score > best.score ? row : best).choice;
for (const rate of ['0.16', '0.18', '0.19', '0.21', '0.22', '0.24']) {
  Object.assign(process.env, baseline, {
    CHOICE_OVERRIDE: bestChoice,
    WEAPON_COOLDOWN_MULT: rate,
    FIRE_RATE_HORNS: rate,
    FIRE_RATE_LASER_EYES: rate,
    FIRE_RATE_BUYBACK: rate,
    FIRE_RATE_DEAD_CAT_BOUNCE: rate,
    FIRE_RATE_AIRDROP: rate,
    FIRE_RATE_GREEN_CANDLE: rate,
  });
  const run = runBot(seed, { mode: 'daily', twist, character: 'bull', style: 'daily', phase: -1 });
  const row = { sweep: 'cooldown', choice: bestChoice, rate, score: run.summary.score, ticks: run.summary.ticks, timeMs: run.summary.timeMs, kills: run.summary.kills, level: run.summary.level, bossKills: run.summary.bossKills, won: run.summary.won, reason: run.summary.reason, hash: run.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score || b.kills - a.kills);
console.log(JSON.stringify({ seed, twist, best: rows[0], bestChoice, top: rows.slice(0, 20), all: rows }, null, 2));
