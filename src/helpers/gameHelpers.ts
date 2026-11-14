/**
 * Format a camelCase or PascalCase identifier into a human-readable string.
 *
 * This function:
 * - Inserts a space before every uppercase letter.
 * - Uppercases the first character of the resulting string.
 *
 * Note: because the implementation inserts a space before every capital letter,
 * if the input starts with an uppercase letter (PascalCase), the transformed
 * string will begin with a leading space and that leading space is the first
 * character that the function attempts to uppercase (which has no visible effect).
 *
 * @param str - The camelCase or PascalCase string to format.
 * @returns A string with spaces inserted before uppercase letters and the first
 *          character of the transformed string uppercased.
 *
 */
export function formatCamelCase(str: string) {
  return (
    str
      // Insert a space before all capital letters
      .replace(/([A-Z])/g, ' $1')
      // Uppercase the first character
      .replace(/^./, (str) => str.toUpperCase())
  );
}

/**
 * Calculates a localized win percentage string.
 *
 * Computes the ratio of gamesWon to gamesPlayed and returns it formatted as a percent
 * using the 'en-US' locale (via Intl.NumberFormat).
 * The computed ratio is used directly; if that ratio is falsy (for example 0 or NaN),
 * the function falls back to 0 before formatting.
 *
 * @param gamesWon - The number of games won. Expected to be a non-negative number.
 * @param gamesPlayed - The total number of games played. If this leads to a falsy ratio,
 *                      the returned value will be the formatted representation of 0.
 * @returns A localized percent string representing the win rate (for example, "75%").
 */
export function calculateWinPercentage(gamesWon: number, gamesPlayed: number) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
  });

  return formatter.format(gamesWon / gamesPlayed || 0);
}
