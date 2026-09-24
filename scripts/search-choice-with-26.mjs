import { spawnSync } from 'node:child_process';
const rows = [];
for (const level of [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29]) for (const index of [0, 1, 2]) {
  const env = { ...process.env, CHOICE_OVERRIDE: `${level}:${index}` };
  const out = spawnSync(process.execPath, ['run-daily.mjs'], { env, encoding: 'utf8' });
  const line = out.stdout.trim().split('\n').findLast((x) => x.startsWith('{'));
  if (!line) continue;
  const r = JSON.parse(line);
  const row = { fixed: '26:0', level, index, score: r.score, timeMs: r.timeMs, kills: r.kills, bossKills: r.bossKills, reason: r.reason, hash: r.hash };
  rows.push(row);
  console.error(JSON.stringify(row));
}
rows.sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ best: rows.slice(0, 15), all: rows }, null, 2));
