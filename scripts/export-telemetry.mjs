import { runBot } from '../run-bot.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const seed = 4144142827;
const run = runBot(seed, { mode: 'daily', twist: 'high_volatility', style: 'daily', phase: -1 });
await mkdir(new URL('../dashboard/', import.meta.url), { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  target: 175000,
  seed,
  twist: 'high_volatility',
  summary: run.summary,
  hash: run.hash,
  replayBytes: run.log.length
};
await writeFile(new URL('../dashboard/telemetry.json', import.meta.url), JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ score: run.summary.score, target: payload.target, hash: run.hash, file: 'dashboard/telemetry.json' }));
