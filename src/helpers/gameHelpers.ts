import type { Route } from "../routes";

export interface Countdown {
    days?: number,
    hours: number,
    minutes: number,
    seconds: number
}

/**
 * Calculate the time remaining until the next local midnight.
 *
 * Uses the system local clock to compute the difference between now and the next
 * midnight (00:00:00 of the following day) and returns the remaining time as
 * whole hours, minutes, and seconds.
 *
 * The returned values are truncated to whole units (milliseconds are discarded).
 *
 * @returns {Countdown} An object with the following properties:
 *  - hours: number — remaining whole hours
 *  - minutes: number — remaining whole minutes after hours are removed (0–59)
 *  - seconds: number — remaining whole seconds after minutes are removed (0–59)
 */
export function getTimeUntilMidnight(): Countdown {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diffMs = midnight.getTime() - now.getTime();

    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    return { hours: hours, minutes: minutes, seconds: seconds } as Countdown;
}

/**
 * Returns the remaining time until the start of the next calendar week (Monday at 00:00:00) using the local timezone.
 *
 * The function:
 *  - Computes the local Monday at midnight for the current date (consistent with a "weeks since" calculation).
 *  - Advances that moment by 7 days to obtain the start of the next week.
 *  - Calculates the difference between the next week's start and the current time and converts it to whole
 *    days, hours, minutes, and seconds.
 *  - Clamps negative differences to zero to guard against clock adjustments or edge cases.
 *
 * Notes:
 *  - Uses the runtime's local system clock and timezone.
 *  - Returned values are integer components (no milliseconds) intended for display in a countdown UI.
 *
 * @returns {Countdown} An object containing integer `days`, `hours`, `minutes`, and `seconds` representing the time remaining
 *                     until next Monday 00:00:00 in local time.
 */
export function getTimeUntilNextWeek(): Countdown {

    const now = new Date();

    // Helper to get the local Monday at midnight for a given date (consistent with getWeeksSince)
    const getMondayStart = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        const day = copy.getDay(); // 0 = Sunday, 1 = Monday, ...
        const daysSinceMonday = (day + 6) % 7;
        copy.setDate(copy.getDate() - daysSinceMonday);
        return copy;
    };

    const thisMonday = getMondayStart(now);
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7); // start of next week (Monday at 00:00:00)

    let diffMs = nextMonday.getTime() - now.getTime();
    // Safety: if for any reason diff is negative, clamp to zero
    if (diffMs < 0) diffMs = 0;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const days = Math.floor(diffMs / MS_PER_DAY);
    const hours = Math.floor((diffMs / 1000 / 60 / 60) % 24);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    return { days: days, hours: hours, minutes: minutes, seconds: seconds } as Countdown;

}

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
    return str
        // Insert a space before all capital letters
        .replace(/([A-Z])/g, ' $1')
        // Uppercase the first character
        .replace(/^./, str => str.toUpperCase());
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
        style: 'percent'
    });

    return formatter.format(gamesWon / gamesPlayed || 0);
}

/**
 * Given a start date and a current date, calculate number of weeks since start date.
 * Weeks are considered to start on Monday. The result is 0 if currentDate falls in the
 * same Monday-starting week as startDate; otherwise it's the number of whole weeks
 * that have passed (clamped to 0 if currentDate is before startDate).
 *
 * @param startDate 
 * @param currentDate 
 */
export function getWeeksSince(startDate: Date, currentDate: Date) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const MS_PER_WEEK = 7 * MS_PER_DAY;

    const getMondayStart = (d: Date) => {
        const copy = new Date(d);
        // Normalize to local midnight to avoid partial-day offsets
        copy.setHours(0, 0, 0, 0);
        // getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
        const day = copy.getDay();
        // Compute how many days to go back to Monday (0 -> -6, 1 -> 0, 2 -> -1, ...)
        const daysSinceMonday = (day + 6) % 7;
        copy.setDate(copy.getDate() - daysSinceMonday);
        return copy;
    };

    const startMonday = getMondayStart(startDate);
    const currentMonday = getMondayStart(currentDate);

    const diffMs = currentMonday.getTime() - startMonday.getTime();
    const weeks = Math.floor(diffMs / MS_PER_WEEK);

    return Math.max(0, weeks);
}

/**
 * Given a start date and a current date, calculate number of days since start date.
 * Days are counted based on local calendar days (normalized to local midnight).
 * The result is 0 if currentDate falls on the same day as startDate; otherwise it's
 * the number of whole days that have passed (clamped to 0 if currentDate is before startDate).
 *
 * @param startDate 
 * @param currentDate 
 */
export function getDaysSince(startDate: Date, currentDate: Date) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const normalizeToMidnight = (d: Date) => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy;
    };

    const start = normalizeToMidnight(startDate);
    const current = normalizeToMidnight(currentDate);

    const diffMs = current.getTime() - start.getTime();
    const days = Math.floor(diffMs / MS_PER_DAY);

    return Math.max(0, days);
}

/**
 * Calculates the game index based on the current date and the game's frequency.
 *
 * For weekly games, returns the number of weeks elapsed since the start date (January 0, 2025).
 * For daily games (or any other frequency), returns the number of days elapsed since the start date.
 *
 * The start date is fixed at January 0, 2025, serving as the epoch for game indexing.
 * This ensures consistent game progression regardless of when the function is called.
 *
 * @param route - The route object containing the game's frequency setting ('weekly' or 'daily').
 * @returns {number} The game index—either the number of weeks or days since the start date,
 *                   depending on the route's frequency. Always non-negative (clamped to 0).
 */
export function getGameIndex(route: Route): number {
    // Daily game to guess
    const today = new Date();
    const start = new Date(2025, 0, 0);
    // Get the index of game (changes daily or weekly depending on frequency)
    const game_index = route.frequency === "weekly" ? (
        getWeeksSince(start, today)
    ) : (
        // Defaults to daily
        getDaysSince(start, today)
    );

    return game_index;
}