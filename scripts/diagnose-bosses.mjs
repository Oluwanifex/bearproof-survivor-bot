import { runBot } from '../run-bot.mjs';
Object.assign(process.env, {
  CHARACTER: 'bull', CHOICE_OVERRIDE: '27:1,28:2,29:2', XP_DECOY: '1', XP_DECOY_CROWD: '2', XP_DECOY_SECONDS: '3', XP_DECOY_FORCE: '0.025', XP_RETURN_FORCE: '0.045', DAILY_THREAT_RADIUS: '70', DAILY_PROJECTILE_MULT: '4.5', DAILY_DRIFT: '0.0015', DAILY_XP_ATTRACTION: '0.012', DAILY_XP_TARGET_RANGE: '300', DAILY_XP_CROWD_LIMIT: '0', LATE_SURVIVE_START: '1160', LATE_THREAT_RADIUS: '110', LATE_PROJECTILE_MULT: '4.5'
});
const r = runBot(4144142827, { mode: 'daily', twist: 'high_volatility', character: 'bull', style: 'daily', phase: -1 });
const events = String(r.log).split('\n').filter(Boolean).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
console.log(JSON.stringify({ summary: r.summary, bossEvents: events.filter((e) => ['boss','bossWarn','bossDown','kill'].includes(e.t)).map((e) => ({t:e.t,id:e.id,name:e.name,boss:e.boss,time:e.time ?? e.t})).slice(-80) }, null, 2));
