import { useEffect, useEffectEvent, useState } from "react";

import ExpandableModal from "../components/ExpandableModal";
import Countdown from "../components/Countdown";
import RouteLinks from "../components/RouteLinks";
import DisplayStats from "../components/DisplayStats";
import ShareButton from "../components/ShareButton";
import GuessBox from "../components/Guessbox";

import type { gameStats } from "../components/DisplayStats";
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
        year?: number;
    }[];
    trivia: {
        label: string;
        value: string;
    }[];
}

export default function useGame({route, games, game_index}: {route: Route, games: Game[], game_index: number}) {
    const [guess, setGuess] = useState<string>("");
    const [guesses, setGuesses] = useState<string[]>([]);
    const [success, setSuccess] = useState<boolean>(false);
    const [stats, setStats] = useState<gameStats>({
        gamesPlayed: 0,
        gamesWon: 0,
        streak: 0,
        maxStreak: 0,
    });
    const [gameOver, setGameOver] = useState<boolean>(false);

    const game: Game = games[game_index % games.length];
    // const answerChoices: string[] = games.map(g => g.answer.title);

    /**
     * Load state from localStorage
     */
    const loadState = useEffectEvent(() => {
        const savedState = localStorage.getItem(`${route.title}_game_state`);
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.lastUpdated === game_index) {
                setGuesses(state.guesses);
                setSuccess(state.success);
                setGameOver(state.gameOver);
            } else {
                // Reset state if it was saved on another day
                localStorage.removeItem(`${route.title}_game_state`);
            }
        }
    });

    // on page load
    useEffect(() => {
        // load state
        loadState();

        // cleanup
        return () => {
            setGuess('');
            setGuesses([]);
            setSuccess(false);
            setStats({
                gamesPlayed: 0,
                gamesWon: 0,
                streak: 0,
                maxStreak: 0,
            });
            setGameOver(false);
        }
    }, []);

    // Save stats to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(`${route.title}_stats`, JSON.stringify(stats));
    }, [stats, route]);

    useEffect(() => {
        // Save state to localStorage on state changes
        const state = {
            guesses: guesses,
            success: success,
            gameIndex: game_index,
            gameOver: gameOver
        };

        localStorage.setItem(`${route.title}_game_state`, JSON.stringify(state));

    }, [guesses, success, gameOver, game, route, game_index]);

    // Update stats as the game progresses
    function updateStats() {
        const newGamesPlayed = stats.gamesPlayed + 1;
        const newGamesWon = success ? stats.gamesWon + 1 : stats.gamesWon;
        const newStreak = success ? stats.streak + 1 : 0;
        const newMaxStreak = newStreak > stats.maxStreak ? newStreak : stats.maxStreak;
        setStats({
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            streak: newStreak,
            maxStreak: newMaxStreak
        });
    }

    // Listen for guesses
    function onGuess(newGuess: string) {
        setGuesses(g => [...g, newGuess]);

        if (newGuess.toLowerCase() === game.answer.title.toLowerCase()) {
            setSuccess(true);
            updateStats();
            setGameOver(true);
        } else if (guesses.length === 5) {
            setSuccess(false);
            updateStats();
            setGameOver(true);
        }

        setGuess('');
    };

    function handleGiveUp() {
        setGuesses(g => [...g, ...Array.from({ length: 6 - g.length }, () => "")])
        setSuccess(false);
        updateStats();
        setGameOver(true);
        setGuess('');
    };

    const GameBoard: React.FC = () => (
        <section className="flex flex-col gap-2 text-sm my-2">
            {gameOver && <>
                <div className="card card-side bg-base-200 shadow">
                    <figure className="w-1/3">
                        <ExpandableModal>
                            <img src={game.answer.image} alt={game.answer.title} className="aspect-2/3 h-full" />
                        </ExpandableModal>
                    </figure>
                    <div className="card-body text-center">
                        <h2 className="font-display card-title justify-center">
                            {success ? (
                                "🎉 You won! 🎉"
                            ) : (
                                "😔 You lost 😔"
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

                <ShareButton guesses={guesses} day={game_index % games.length + 1} answer={game.answer.title} route={route} />

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
                                {hint.title}&nbsp;{hint.year ? `(${hint.year})` : ''}
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
                <GuessBox options={games.map(g => g?.answer?.title).filter(g => g)} disabled={guesses.length === 6 || gameOver} state={guess} setState={setGuess} />
                
                <button className={["btn join-item", guess ? "btn-accent" : "btn-warning"].join("\x20")} disabled={guesses.length === 6 || gameOver}>
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

            <button className="btn btn-error mx-auto shadow" disabled={guesses.length === 6 || gameOver} onClick={handleGiveUp}>Give up</button>
        </section>
    );

    return { stats, GameBoard };
}
