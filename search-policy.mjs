import { Simulation } from './src/sim/sim.js';
import { RunRecorder } from './src/sim/runlog.js';
import { chooseUpgrade } from './run-bot.mjs';
import { encodeMove } from './src/sim/input-codes.js';

const seed = Number(process.argv[2] || 4144142827);
const configs = [];
for (const threatRadius of [75, 95]) {
  for (const repel of [0.7, 1.2]) {
    for (const approach of [0.05, 0.15]) configs.push({ threatRadius, repel, xp: 0.18, approach });
  }
}
function move(sim, t, c) {
  const p = sim.player; let fx = Math.cos(t / 240) * 0.08; let fy = Math.sin(t / 240) * 0.08; let crowd = 0;
  for (const e of sim.enemies) {
    const dx = p.x - e.x; const dy = p.y - e.y; const d = Math.hypot(dx, dy) || 1; const r = e.boss ? c.threatRadius * 2.3 : c.threatRadius;
    if (d < r) { const w = (1 - d / r) ** 2; fx += dx / d * w * c.repel; fy += dy / d * w * c.repel; crowd++; }
  }
  for (const b of sim.enemyProjectiles) {
    const dx = p.x - b.x; const dy = p.y - b.y; const d = Math.hypot(dx, dy) || 1;
    if (d < 130) { const w = (1 - d / 130) ** 2; fx += dx / d * w * (c.repel + 1); fy += dy / d * w * (c.repel + 1); }
  }
  const orb = sim.xp.reduce((best, x) => { const d = (x.x - p.x) ** 2 + (x.y - p.y) ** 2; return !best || d < best.d ? { x, d } : best; }, null)?.x;
  if (orb && crowd < 2 && Math.hypot(orb.x - p.x, orb.y - p.y) < 450) {
    const d = Math.hypot(orb.x - p.x, orb.y - p.y) || 1; fx += (orb.x - p.x) / d * c.xp; fy += (orb.y - p.y) / d * c.xp;
  }
  if (crowd === 0) {
    const target = sim.enemies.reduce((best, e) => {
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      return !best || d < best.d ? { e, d } : best;
    }, null)?.e;
    if (target) {
      const d = Math.hypot(target.x - p.x, target.y - p.y) || 1;
      if (d > 80) { fx += (target.x - p.x) / d * c.approach; fy += (target.y - p.y) / d * c.approach; }
    }
  }
  const len = Math.hypot(fx, fy) || 1; return encodeMove(fx / len, fy / len);
}
function run(c) {
  const sim = new Simulation({ seed, twist: 'high_volatility' }); const rec = new RunRecorder(seed, 'high_volatility');
  for (let t = 0; !sim.over; t++) { if (sim.choices) { const i = chooseUpgrade(sim); rec.pick(sim.tick, i); sim.choose(i); continue; } const code = move(sim, t, c); rec.tick(code); sim.step(code); sim.drainEvents(); }
  return sim.summary();
}
const rows = configs.map((config) => ({ config, ...run(config) })).sort((a, b) => b.score - a.score);
console.log(JSON.stringify({ seed, best: rows.slice(0, 10) }, null, 2));
