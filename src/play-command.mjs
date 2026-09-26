const USAGE = 'Format: /Play <username> <Solana address> [Auto [score]]';

export function parsePlayCommand(text) {
  const args = String(text || '')
    .replace(/^\/play(?:@\w+)?\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (args.length < 2 || args.length > 4) return { error: USAGE };

  const auto = args.length >= 3 && args[2].toLowerCase() === 'auto';
  if (args.length >= 3 && !auto) return { error: USAGE };
  if (args.length === 4 && !auto) return { error: USAGE };

  let targetScore = null;
  if (args.length === 4) {
    if (!/^\d+$/.test(args[3])) return { error: 'Score target must be a positive whole number.' };
    targetScore = Number(args[3]);
    if (!Number.isSafeInteger(targetScore) || targetScore < 1) {
      return { error: 'Score target must be a positive whole number.' };
    }
  }

  return { username: args[0], payout: args[1], auto, targetScore };
}
