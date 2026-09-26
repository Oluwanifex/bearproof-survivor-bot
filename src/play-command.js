const SCORE_TARGET_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;

export function parsePlayArgs(args) {
  if (!Array.isArray(args) || args.length < 2 || args.length > 4) {
    throw new Error('Format: /Play <username> <Solana address> [auto [score-target]]');
  }
  const auto = args[2]?.toLowerCase() === 'auto';
  if ((args[2] && !auto) || (args.length === 4 && !auto)) {
    throw new Error('A score target can only be used with Auto. Format: /Play <username> <Solana address> Auto <score-target>');
  }

  let scoreTarget = null;
  if (args[3] !== undefined) {
    if (!SCORE_TARGET_PATTERN.test(args[3])) {
      throw new Error('Score target must be a positive whole number, such as 137000 or 137,000.');
    }
    scoreTarget = Number(args[3].replaceAll(',', ''));
    if (!Number.isSafeInteger(scoreTarget) || scoreTarget <= 0) {
      throw new Error('Score target must be a positive whole number.');
    }
  }
  return { name: args[0], payout: args[1], auto, scoreTarget };
}
