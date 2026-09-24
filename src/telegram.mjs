import 'dotenv/config';
import crypto from 'node:crypto';
import { Telegraf } from 'telegraf';
import { runBot } from '../run-bot.mjs';

const API_BASE = process.env.BEARPROOF_URL || 'https://bearproof.app';
const BUILD = Number(process.env.BEARPROOF_BUILD || 2);
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
  return crypto.createHash('sha256').update(`bearproof:${chatId}`).digest('hex').slice(0, 32);
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || data?.error || `Bearproof API ${response.status}`);
  return data;
}
async function daily() { return api('/api/daily'); }

bot.start((ctx) => ctx.reply('Bearproof Survivor Bot ready. Use /Play <username> <Solana address>.'));
bot.command('play', async (ctx) => {
  const args = ctx.message.text.replace(/^\/play(?:@\w+)?\s*/i, '').trim().split(/\s+/).filter(Boolean);
  if (args.length !== 2) return ctx.reply('Format: /Play <username> <Solana address>');
  let name; let payout;
  try { name = username(args[0]); payout = address(args[1]); } catch (error) { return ctx.reply(error.message); }
  if (sessions.has(ctx.chat.id)) return ctx.reply('A Bearproof run is already active for this chat.');
  sessions.set(ctx.chat.id, true);
  try {
    const challenge = await daily();
    if (Number(challenge.build) !== BUILD) throw new Error(`Daily board is Build #${challenge.build}; this controller is Build #${BUILD}.`);
    const id = playerId(ctx.chat.id);
    await api('/api/session', { method: 'POST', body: JSON.stringify({ playerId: id, build: BUILD, mode: 'daily' }) });
    await api('/api/player', { method: 'POST', body: JSON.stringify({ playerId: id, name }) });
    await api('/api/payout-address', { method: 'POST', body: JSON.stringify({ playerId: id, address: payout }) });
    await ctx.reply(`Running Bearproof Daily Build #${BUILD} (${challenge.twist?.name || 'no twist'}) for ${name}…`);
    const run = runBot(challenge.seed, { mode: 'daily', twist: challenge.twist?.id });
    const summary = run.summary;
    const result = await api('/api/runs', { method: 'POST', body: JSON.stringify({
      v: 1, playerId: id, name, mode: 'daily', challengeDate: challenge.date, build: BUILD,
      seed: challenge.seed, stage: summary.stage,
      claimed: { score: summary.score, timeMs: summary.timeMs, kills: summary.kills, level: summary.level },
      durationMs: summary.timeMs, log: Buffer.from(run.log).toString('base64url')
    }) });
    await ctx.reply(`Run complete: ${summary.score.toLocaleString()} score, ${summary.kills.toLocaleString()} kills, level ${summary.level}, ${summary.reason}.\n${result.rank ? `Board rank: #${result.rank}` : 'Verification pending.'}`);
  } catch (error) {
    console.error(error);
    await ctx.reply(`Bearproof run failed safely: ${error.message}`);
  } finally { sessions.delete(ctx.chat.id); }
});
bot.launch().then(() => console.log('Bearproof bot listening'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
