import { calculateWinPercentage } from "../helpers/gameHelpers";

export interface gameStats {
    gamesPlayed: number;
    gamesWon: number;
    streak: number;
    maxStreak: number;
}

export default function DisplayStats({stats}:{stats: gameStats}) {
    return <div className="stats shadow flex-wrap bg-base-200 w-full">
        <div className="stat place-items-center">
            <div className="stat-title">Wins</div>
            <div className="stat-value">{stats.gamesWon}</div>
            <div className="stat-desc"><b>Games played:</b> {stats.gamesPlayed}</div>
            <div className="stat-desc"><b>Win rate:</b> {calculateWinPercentage(stats.gamesWon, stats.gamesPlayed)}</div>
        </div>
        <div className="stat place-items-center">
            <div className="stat-title">Streak</div>
            <div className="stat-value">{stats.streak}</div>
            <div className="stat-desc"><b>Max streak:</b> {stats.maxStreak}</div>
        </div>
    </div>
}