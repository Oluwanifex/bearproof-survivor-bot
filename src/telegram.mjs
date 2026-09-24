import 'dotenv/config';
import crypto from 'node:crypto';
import { Markup, Telegraf } from 'telegraf';
import { advanceInteractiveRun, chooseUpgrade, createInteractiveRun, upgradeDescription } from '../run-bot.mjs';

const API_BASE = process.env.BEARPROOF_URL || 'https://bearproof.app';
const BUILD = Number(process.env.BEARPROOF_BUILD || 2);
const EXTENDED_TEST = process.env.TELEGRAM_EXTENDED_TEST === '1';
if (EXTENDED_TEST) {
  // Research-only mode: this exceeds the server's 72,000-tick verifier limit.
  // It must never submit the resulting replay to /api/runs.
  process.env.MAX_TICKS = process.env.MAX_TICKS || '100800';
  process.env.FARM_AFTER_WIN = '1';
  process.env.FARM_ENEMY_WEIGHT = process.env.FARM_ENEMY_WEIGHT || '4';
  process.env.FARM_BOSS_WEIGHT = process.env.FARM_BOSS_WEIGHT || '5';
  process.env.FARM_PROJECTILE_WEIGHT = process.env.FARM_PROJECTILE_WEIGHT || '7';
}
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
const bot = new Telegraf(token);
const sessions = new Map();

function address(value) {
  const out = String(value || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(out)) throw new Error('Use a Solana public address (base58, 32–44 characters).');
  return out;
}
function username(value) {
  const out = String(value || '').trim();
  if (!/^[A-Za-z0-9_@.-]{1,32}$/.test(out)) throw new Error('Use a username up to 32 letters, numbers, dots, dashes, or underscores.');
  return out;
}
function playerId(chatId) {
  // Bearproof validates playerId as UUID v4. Derive it deterministically from
  // the Telegram chat ID so the same chat keeps the same player identity.
  const bytes = crypto.createHash('sha256').update(`bearproof:${chatId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || data?.error || `Bearproof API ${response.status}`);
  return data;
}
async function daily() { return api('/api/daily'); }

function choiceKeyboard(chatId, choices) {
  return Markup.inlineKeyboard(choices.map((card, index) => [
    Markup.button.callback(`${index + 1}. ${upgradeDescription(card)}`, `upgrade:${chatId}:${index}`)
  ]));
}

async function promptUpgrade(ctx, session, summary) {
  const choices = session.run.sim.choices || [];
  if (session.auto) {
    const choice = chooseUpgrade(session.run.sim);
    setImmediate(() => continueRun(ctx, session, choice).catch((error) => {
      console.error(error);
      sessions.delete(ctx.chat.id);
      ctx.reply(`Bearproof run failed safely: ${error.message}`).catch(() => {});
    }));
    return;
  }
  const lines = [
    `Level ${summary.level} reached · score ${summary.score.toLocaleString()}`,
    `HP: ${Math.ceil(session.run.sim.player.hp)}/${Math.ceil(session.run.sim.player.maxHp)}`,
    'Choose your upgrade:',
    ...choices.map((card, index) => `${index + 1}. ${upgradeDescription(card)}`)
  ];
  session.waitingForUpgrade = true;
  await ctx.reply(lines.join('\n'), choiceKeyboard(ctx.chat.id, choices));
}

async function submitFinished(ctx, session, result) {
  const summary = result.summary;
  if (EXTENDED_TEST) {
    await ctx.reply(`Extended local test complete: ${summary.score.toLocaleString()} score, ${summary.kills.toLocaleString()} kills, level ${summary.level}, ${summary.reason}.\nNo submission made: ${summary.timeMs.toLocaleString()} ms exceeds the 72,000-tick verifier window.`);
    return;
  }
  const response = await api('/api/runs', { method: 'POST', body: JSON.stringify({
    v: 1,
    playerId: session.playerId,
    name: session.name,
    mode: 'daily',
    challengeDate: session.challenge.date,
    build: BUILD,
    seed: session.challenge.seed,
    stage: summary.stage,
    claimed: { score: summary.score, timeMs: summary.timeMs, kills: summary.kills, level: summary.level },
    durationMs: summary.timeMs,
    log: Buffer.from(result.log).toString('base64url')
  }) });
  await ctx.reply(`Run complete: ${summary.score.toLocaleString()} score, ${summary.kills.toLocaleString()} kills, level ${summary.level}, ${summary.reason}.\n${response.rank ? `Board rank: #${response.rank}` : 'Verification pending.'}`);
}

async function continueRun(ctx, session, choice = null) {
  const result = advanceInteractiveRun(session.run, { choice });
  if (result.status === 'choice') return promptUpgrade(ctx, session, result.summary || session.run.sim.summary());
  if (result.status === 'done') {
    await submitFinished(ctx, session, result);
    sessions.delete(ctx.chat.id);
    return;
  }
  // Keep the event loop responsive while advancing a long deterministic run.
  setImmediate(() => continueRun(ctx, session).catch((error) => {
    console.error(error);
    sessions.delete(ctx.chat.id);
    ctx.reply(`Bearproof run failed safely: ${error.message}`).catch(() => {});
  }));
}

bot.start((ctx) => ctx.reply('Bearproof Survivor Bot ready. Use /Play <username> <Solana address> for manual upgrades, or add `auto` for automatic high-score choices.'));

bot.command('play', async (ctx) => {
  const args = ctx.message.text.replace(/^\/play(?:@\w+)?\s*/i, '').trim().split(/\s+/).filter(Boolean);
  if (args.length < 2 || args.length > 3 || (args[2] && args[2].toLowerCase() !== 'auto')) {
    return ctx.reply('Format: /Play <username> <Solana address> [auto]');
  }
  const auto = args[2]?.toLowerCase() === 'auto';
  let name; let payout;
  try { name = username(args[0]); payout = address(args[1]); } catch (error) { return ctx.reply(error.message); }
  if (sessions.has(ctx.chat.id)) return ctx.reply('A Bearproof run is already active for this chat.');
  const session = { name, payout, auto, telegramUserId: ctx.from?.id, playerId: playerId(ctx.chat.id), waitingForUpgrade: false };
  sessions.set(ctx.chat.id, session);
  try {
    const challenge = await daily();
    if (Number(challenge.build) !== BUILD) throw new Error(`Daily board is Build #${challenge.build}; this controller is Build #${BUILD}.`);
    session.challenge = challenge;
    await api('/api/session', { method: 'POST', body: JSON.stringify({ playerId: session.playerId, build: BUILD, mode: 'daily' }) });
    await api('/api/player', { method: 'POST', body: JSON.stringify({ playerId: session.playerId, name }) });
    await api('/api/payout-address', { method: 'POST', body: JSON.stringify({ playerId: session.playerId, address: payout }) });
    session.run = createInteractiveRun(challenge.seed, { mode: 'daily', twist: challenge.twist?.id, style: 'daily', phase: -1 });
    await ctx.reply(`Running Bearproof Daily Build #${BUILD} (${challenge.twist?.name || 'no twist'}) for ${name} in ${auto ? 'automatic high-score' : 'manual upgrade'} mode${EXTENDED_TEST ? ' [EXTENDED LOCAL TEST — NOT SUBMITTED]' : ''}.`);
    await continueRun(ctx, session);
  } catch (error) {
    console.error(error);
    sessions.delete(ctx.chat.id);
    await ctx.reply(`Bearproof run failed safely: ${error.message}`);
  }
});

bot.action(/^upgrade:(-?\d+):(\d+)$/, async (ctx) => {
  const chatId = Number(ctx.match[1]);
  const index = Number(ctx.match[2]);
  const session = sessions.get(chatId);
  if (!session || !session.run) return ctx.answerCbQuery('This run is no longer active.');
  if (ctx.from?.id !== session.telegramUserId) return ctx.answerCbQuery('Only the player who started this run can choose.');
  if (!session.waitingForUpgrade) return ctx.answerCbQuery('The bot is not waiting for an upgrade.');
  if (!session.run.sim.choices?.[index]) return ctx.answerCbQuery('That upgrade choice is no longer available.');
  session.waitingForUpgrade = false;
  await ctx.answerCbQuery(`Selected ${index + 1}`);
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  try { await continueRun(ctx, session, index); }
  catch (error) {
    console.error(error);
    sessions.delete(chatId);
    await ctx.reply(`Bearproof run failed safely: ${error.message}`);
  }
});

bot.command('status', async (ctx) => {
  const session = sessions.get(ctx.chat.id);
  if (!session?.run) return ctx.reply('No active run. Use /Play <username> <Solana address>.');
  const summary = session.run.sim.summary();
  return ctx.reply(`Time ${Math.round(summary.timeMs / 1000)}s · score ${summary.score.toLocaleString()} · kills ${summary.kills} · level ${summary.level} · HP ${Math.ceil(session.run.sim.player.hp)}/${Math.ceil(session.run.sim.player.maxHp)} · ${session.auto ? 'auto mode' : 'manual mode'}${session.waitingForUpgrade ? '\nWaiting for your upgrade choice.' : ''}`);
});

bot.command('stop', async (ctx) => {
  if (!sessions.delete(ctx.chat.id)) return ctx.reply('No active run.');
  return ctx.reply('Run stopped. No score was submitted.');
});

bot.launch().then(() => console.log('Bearproof bot listening'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
