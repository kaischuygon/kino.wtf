import { useEffect, useMemo, useState } from "react";

import ExpandableModal from "../components/ExpandableModal";
import Countdown from "../components/Countdown";
import RouteLinks from "../components/RouteLinks";
import DisplayStats from "../components/DisplayStats";
import ShareButton from "../components/ShareButton";
import GuessBox from "../components/Guessbox";

import type { GameStats } from "../components/DisplayStats";
import type { Route } from "../routes";

interface Game {
    answer: {
        id: number;
        title: string;
        image: string;
        URL: string;
    },
    hints: {
        title: string;
        image: string;
        link: string;
        year?: number;
    }[];
    trivia: {
        label: string;
        value: string;
    }[];
}

interface GameState {
    guess:string,
    guesses:string[],
    gameOver:0|1|2, // 0 game not over, 1 game over fail, 2 game over success
    gameIndex: number
}

export default function useGame(route: Route, games: Game[], gameIndex: number) {
    const savedState: GameState = useMemo(() => {
        const defaultState: GameState = {
            guess: "",
            guesses: [],
            gameOver: 0,
            gameIndex: gameIndex
        };

        const key = `${route.title}_game_state`;
        const raw = localStorage.getItem(key);
        if (!raw) return defaultState;

        try {
            const parsed = JSON.parse(raw);
            if(parsed?.gameIndex === gameIndex) {
                return {
                    guess: typeof parsed?.guess === "string" ? parsed.guess : "",
                    guesses: Array.isArray(parsed?.guesses) ? parsed.guesses : [],
                    gameOver: typeof parsed?.gameOver === "number" ? parsed?.gameOver : 0,
                    gameIndex: typeof parsed?.gameIndex === "number" ? parsed?.gameIndex : gameIndex
                }
            } else {
                localStorage.removeItem(key);
                return defaultState;
            }
        } catch {
            localStorage.removeItem(key);
            return defaultState;
        }
    }, [route, gameIndex]);

    
    const savedStats: GameStats = useMemo(() => {
        const defaultStats: GameStats = {
            gamesPlayed: 0,
            gamesWon: 0,
            streak: 0,
            maxStreak: 0
        };

        const key = `${route.title}_stats`;
        const raw = localStorage.getItem(key);
        if (!raw) return defaultStats;

        try {
            const parsed = JSON.parse(raw);
            return {
                gamesPlayed: Number.isFinite(parsed?.gamesPlayed) ? parsed.gamesPlayed : 0,
                gamesWon: Number.isFinite(parsed?.gamesWon) ? parsed.gamesWon : 0,
                streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
                maxStreak: Number.isFinite(parsed?.maxStreak) ? parsed.maxStreak : 0
            };
        } catch {
            localStorage.removeItem(key);
            return defaultStats;
        }
    }, [route]);

    const [guess, setGuess] = useState<string>(savedState.guess);
    const [guesses, setGuesses] = useState<string[]>(savedState.guesses);
    const [gameOver, setGameOver] = useState<0|1|2>(savedState.gameOver);
    const [stats, setStats] = useState<GameStats>(savedStats);

    const game: Game = games[gameIndex % games.length];

    useEffect(() => {
        // cleanup
        return () => {
            setGuess(savedState.guess);
            setGuesses(savedState.guesses);
            setGameOver(savedState.gameOver);
            setStats(savedStats);
        }
    }, [savedState, savedStats]);

    // Save stats to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(`${route.title}_stats`, JSON.stringify(stats));
    }, [stats, route]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        // Save state to localStorage on state changes
        const state = {
            guess: guess,
            guesses: guesses,
            gameIndex: gameIndex,
            gameOver: gameOver
        };

        localStorage.setItem(`${route.title}_game_state`, JSON.stringify(state));

    }, [guess, guesses, gameOver, game, route, gameIndex]);

    // Update stats when the game is over
    function updateStats(gameStatus: number) {
        const newGamesPlayed = stats.gamesPlayed + 1;
        const newGamesWon = gameStatus === 2 ? stats.gamesWon + 1 : stats.gamesWon;
        const newStreak = gameStatus === 2 ? stats.streak + 1 : 0;
        const newMaxStreak = newStreak > stats.maxStreak ? newStreak : stats.maxStreak;
        
        setStats({
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            streak: newStreak,
            maxStreak: newMaxStreak
        });
    };

    // Listen for guesses
    function onGuess(newGuess: string) {
        setGuesses(g => [...g, newGuess]);

        // check if game is over
        if (newGuess.toLowerCase() === game.answer.title.toLowerCase()) {
            setGameOver(2);
            updateStats(2);
        } else if (guesses.length === 5) {
            setGameOver(1);
            updateStats(1);
        }

        setGuess('');
    };

    function handleGiveUp() {
        setGuesses(g => [...g, ...Array.from({ length: 6 - g.length }, () => "")])
        setGameOver(1);
        updateStats(1);
        setGuess('');
    };

    const GameBoard: React.FC = () => (
        <section className="flex flex-col gap-2 text-sm my-2">
            {gameOver > 0 && <>
                <div className="card card-side bg-base-200 shadow">
                    <figure className="w-1/3">
                        <ExpandableModal>
                            <img src={game.answer.image} alt={game.answer.title} className="aspect-2/3 h-full" />
                        </ExpandableModal>
                    </figure>
                    <div className="card-body text-center">
                        <h2 className="font-display card-title justify-center">
                            {gameOver == 1 ? (
                                "😔 You lost 😔"
                            ) : (
                                "🎉 You won! 🎉"
                            )}
                        </h2>
                        <p>
                            The answer was: <a className="link link-primary" href={game.answer.URL} rel="noopen noreferrer" target="_blank">{game.answer.title}</a>
                        </p>
                        <p>
                            Next game in:
                        </p>
                        <p>
                            <Countdown frequency={route.frequency} />
                        </p>
                    </div>
                </div>

                <DisplayStats stats={stats} />

                <ShareButton guesses={guesses} day={gameIndex + 1} answer={game.answer.title} route={route} />

                <h2 className="text-xl font-medium text-center">More games:</h2>
                <RouteLinks />

            </>}

            <h4><b>Hints:</b>&nbsp;({guesses.length + 1 > 6 ? "6" : guesses.length + 1}/6)</h4>
            <div className="grid grid-cols-3 gap-2">
                {game?.hints.map((hint, i) =>
                    <ExpandableModal key={i} disabled={guesses.length < i && !gameOver}>
                        <div className={["card", guesses.length < i && !gameOver ? "**:opacity-0 select-none" : ""].join("\x20")}>
                            <figure>
                                <img src={hint.image} alt={hint.title} className="aspect-2/3 h-full" />
                            </figure>
                            <div className="card-body text-center p-1">
                                {gameOver > 0 ? (
                                    <a className="text-wrap link" href={hint.link} rel="noopen norefferer" target="_blank">
                                        {hint.title}{hint.year ? `\x20(${hint.year})` : ''}
                                    </a>
                                ) : (
                                    <span className="text-wrap">
                                        {hint.title}{hint.year ? `\x20(${hint.year})` : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    </ExpandableModal>
                )}
            </div>

            <h4><b>Trivia:</b>&nbsp;({Math.ceil(guesses.length / 2)}/3)</h4>
            <ul className="flex flex-wrap gap-2 justify-center">
                {game.trivia?.map((t, i) =>
                    <li key={i} className={["badge shadow max-w-full h-fit text-center", Math.ceil(guesses.length / 2) <= i && !gameOver ? "badge-soft **:opacity-0 select-none" : "badge-info"].join("\x20")}>
                        <span>
                            <b>{t.label}:</b>&nbsp;{t.value}
                        </span>
                    </li>
                )}
            </ul>

            <form onSubmit={e => { e.preventDefault(); onGuess(guess.trim()); }} className="w-full join">
                <GuessBox options={games.map(g => g?.answer?.title).filter(g => g).sort()} disabled={guesses.length === 6 || gameOver > 0} state={guess} setState={setGuess} />
                
                <button className={["btn join-item", guess ? "btn-primary" : "btn-soft"].join("\x20")} disabled={guesses.length === 6 || gameOver > 0}>
                    {guess ? "Guess" : "Skip"}
                </button>
            </form>

            <h4><b>Guesses:</b>&nbsp;({guesses.length}/6)</h4>
            <ul className="flex flex-wrap gap-2 justify-center">
                {[...Array(6)].map((_, i) => {
                    let style = "badge-soft w-10";
                    let text = "";
                    
                    if (guesses[i]?.toLowerCase() === game.answer.title.toLowerCase()) {
                        style = "badge-success";
                        text = guesses[i];
                    } else if (guesses[i] === "") {
                        style = "badge-warning";
                        text = "Skipped";
                    } else if (typeof guesses[i] === "string") {
                        style = "badge-error";
                        text = guesses[i];
                    }

                    return <li key={i} className={["badge shadow max-w-xs truncate justify-start", style].join("\x20")}>
                        {text}
                    </li>
                })}
            </ul>

            <button className="btn btn-error mx-auto shadow" disabled={guesses.length === 6 || gameOver > 0} onClick={handleGiveUp}>Give up</button>
        </section>
    );

    return { stats, GameBoard };
}
