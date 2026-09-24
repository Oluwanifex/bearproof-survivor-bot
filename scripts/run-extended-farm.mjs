/**
 * Research-only extended-farming run.
 *
 * This intentionally exceeds the challenge verifier's 72,000-tick limit and
 * MUST NOT be submitted. It exists only to reproduce the local high-score
 * experiment and compare post-boss farming behavior.
 */
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  MAX_TICKS: process.env.MAX_TICKS || '100800',
  FARM_AFTER_WIN: '1',
  FARM_ENEMY_WEIGHT: process.env.FARM_ENEMY_WEIGHT || '4',
  FARM_BOSS_WEIGHT: process.env.FARM_BOSS_WEIGHT || '5',
  FARM_PROJECTILE_WEIGHT: process.env.FARM_PROJECTILE_WEIGHT || '7',
};

const result = spawnSync(process.execPath, ['run-daily.mjs'], {
  env,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

process.stdout.write(result.stdout || '');
process.exit(result.status ?? 1);
