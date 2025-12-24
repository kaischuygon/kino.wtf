export interface Countdown {
    hours: number,
    minutes: number,
    seconds: number
}

export function getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diffMs = midnight.getTime() - now.getTime();

    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    return { hours: hours, minutes: minutes, seconds: seconds } as Countdown;
}

export function formatCamelCase(str: string) {
    return str
        // Insert a space before all capital letters
        .replace(/([A-Z])/g, ' $1')
        // Uppercase the first character
        .replace(/^./, str => str.toUpperCase());
}

export function calculateWinPercentage(gamesWon: number, gamesPlayed: number) {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent'
    });

    return formatter.format(gamesWon / gamesPlayed);
}