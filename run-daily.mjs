import { runBot } from './run-bot.mjs';
const seed = 4144142827;
const run = runBot(seed, { mode: 'daily', twist: 'high_volatility' });
console.log(JSON.stringify({ seed, twist: 'high_volatility', ...run.summary, replayBytes: run.log.length, hash: run.hash }));
