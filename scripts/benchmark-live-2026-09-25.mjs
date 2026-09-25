import { runBot } from '../run-bot.mjs';
Object.assign(process.env, {
  CHARACTER: 'bull', CHOICE_OVERRIDE: '', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5'
});
const seed = 3994460340;
const r = runBot(seed, { mode: 'daily', twist: 'whale_season', character: 'bull', style: 'daily', phase: -1 });
console.log(JSON.stringify({ seed, twist: r.twist, summary: r.summary, hash: r.hash }));
