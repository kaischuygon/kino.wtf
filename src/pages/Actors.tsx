import { FaChartBar, FaInfoCircle } from "react-icons/fa";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import actors from "../../get_movies/actors.json";
import useModal from "../hooks/useModal";
import ExpandableModal from "../components/ExpandableModal";
import Countdown from "../components/Countdown";
import { calculateWinPercentage } from "../helpers/gameHelpers";
import RouteLinks from "../components/RouteLinks";
interface gameStats {
    gamesPlayed: number;
    gamesWon: number;
    streak: number;
    maxStreak: number;
}

export interface Actor {
    Credits: {
        image: string;
        title: string;
        year: number;
    }[];
    Headshot: string;
    Hints: {
        Birthdate: string;
        Gender: string;
        "Place of Birth": string;
    };
    Name: string;
    "TMDb ID": number;
    URL: string;
}

function GameNavigation({stats}: {stats:gameStats}) {
    const { Modal: StatsModal, open: openStatsModal } = useModal();
    const { Modal: AboutModal, open: openAboutModal } = useModal();

    return <nav className="navbar">
        <div className="navbar-start">
            <StatsModal>
                <h3 className="font-bold text-lg mb-4"><FaChartBar className="inline" />&nbsp;Stats</h3>
                <div className="text-center">
                    <DisplayStats stats={stats} />
                </div>
            </StatsModal>
            <button className="btn btn-ghost btn-circle tooltip" data-tip="Stats" onClick={() => openStatsModal()}>
                <FaChartBar />
            </button>
        </div>
        <div className="navbar-center font-display">
            🎭&nbsp;Actors
        </div>
        <div className="navbar-end">
            <button className="btn btn-ghost btn-circle tooltip" data-tip="How to play" onClick={() => openAboutModal()}>
                <FaInfoCircle />
            </button>
            <AboutModal>
                <h3 className="font-bold text-lg mb-4">🎭&nbsp;Actors</h3>
                <div className="flex flex-col gap-2">
                    <p>
                        Guess the actor based on their filmography. The hints are based on their top 6 credits
                        (in reverse order) as well as other trivia.
                    </p>
                    <h3 className="font-bold text-lg">How to play</h3>
                    <ul className="list-disc ml-8">
                        <li>
                            Use the hints provided to guess an actor.
                        </li>
                        <li>
                            If you guess incorrectly, another credit and/or another hint will be revealed.
                        </li>
                        <li>
                            Leave the input blank to skip a guess and get the next hint.
                        </li>
                        <li>
                            You have 6 guesses to guess the actor.
                        </li>
                    </ul>
                </div>
            </AboutModal>
        </div>
    </nav>
}

function DisplayStats({stats}:{stats: gameStats}) {
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

// Copy result to clipboard
function ShareButton({guesses, day, answer}: {guesses: string[], day: number, answer: Actor}) {
    const button = useRef<HTMLButtonElement | null>(null);

    let score = ''
    for (let i = 0; i < guesses.length; i++) {
        console.log(guesses[i])
        score += guesses[i].toLowerCase() === answer.Name.toLowerCase() ? '🟩' : (guesses[i].trim() === '' ? '🟨' : '🟥')
    }
    for (let i = 0; i < 6 - guesses.length; i++) {
        score += '⬛'
    }

    const result = `🎭 Kino ${window.location.pathname.replace('/', '')} ﹟${day % actors.length + 1}\n${score}\n📼 ${window.location}`

    function handleClick() {
        navigator.clipboard.writeText(result)
            .then(() => {
                console.log('Copied to clipboard')
                if (button.current) {
                    // use textContent to avoid parsing HTML and ensure safe update
                    button.current.textContent = 'Copied!'
                    // Reset button text after 2 seconds
                    setTimeout(() => {
                        if (button.current) {
                            button.current.textContent = 'Share'
                        }
                    }, 2000)
                }
            })
            .catch((error) => console.log('Error copying to clipboard', error));
    }

    return <button ref={button} className="btn btn-primary shadow" onClick={() => handleClick()}>
        Share
    </button>
}


export default function Actors() {
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

    // Daily actor to guess
    const today = new Date();
    const start = new Date(2025, 11, 23);
    const day = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const answer: Actor = actors[day % actors.length];
    const choices: Actor[] = actors;

    /**
     * Load state from localStorage
     */
    const loadState = useEffectEvent(() => {
        const savedState = localStorage.getItem('actorGameState');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.lastUpdated === new Date().getDate()) {
                setGuesses(state.guesses);
                setSuccess(state.success);
                setGameOver(state.gameOver);
            } else {
                // Reset state if it was saved on another day
                localStorage.removeItem('actorGameState');
            }
        }
    });

    // on page load
    useEffect(() => {
        // load state
        loadState();

        // cleanup
        return () => {
            setGuess("");
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
        localStorage.setItem('actorStats', JSON.stringify(stats));
    }, [stats]);

    useEffect(() => {
        // Save state to localStorage on state changes
        const state = {
            guesses: guesses,
            success: success,
            lastUpdated: new Date().getDate(),
            gameOver: gameOver
        };

        localStorage.setItem('actorGameState', JSON.stringify(state));

    }, [guesses, success, gameOver, answer]);

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

        if (newGuess.toLowerCase() === answer.Name.toLowerCase()) {
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
        setGuesses(g => [...g, ...Array.from({length: 6 - g.length}, () => "")])
        setSuccess(false);
        updateStats();
        setGameOver(true);
        setGuess('');
    }

    return <>
        <GameNavigation stats={stats} />
        <section className="flex flex-col gap-2 text-sm my-2">
            {gameOver && <>
                <div className="card card-side bg-base-200 shadow">
                    <figure className="w-1/3">
                        <ExpandableModal>
                            <img src={answer.Headshot} alt={answer.Name} />
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
                            The answer was: <a className="link link-primary" href={answer.URL} rel="noopen noreferrer" target="_blank">{answer.Name}</a>
                        </p>
                        <p>
                            Next game in:
                        </p>
                        <p>
                            <Countdown />
                        </p>
                    </div>
                </div>

                <DisplayStats stats={stats} />

                <ShareButton guesses={guesses} day={day} answer={answer} />

                <h3 className="text-lg text-center">More games:</h3>
                <RouteLinks />

            </>}

            <h2><b>Films:</b>&nbsp;({guesses.length + 1 > 6 ? "6" : guesses.length + 1}/6)</h2>
            <div className="grid grid-cols-3 gap-2">
                {answer?.Credits.map((credit, i) =>
                    <ExpandableModal key={i} disabled={guesses.length < i && !gameOver}>
                        <div className={["card shadow bg-base-200", guesses.length < i && !gameOver ? "**:opacity-0 select-none" : ""].join(" ")}>
                            <figure>
                                <img src={credit.image} alt={credit.title} />
                            </figure>
                            <div className="card-body text-center p-1">
                                {credit.title} ({credit.year})
                            </div>
                        </div>
                    </ExpandableModal>
                )}
            </div>

            <h2><b>Hints:</b>&nbsp;({Math.ceil(guesses.length / 2)}/3)</h2>
            <ul className="flex flex-wrap gap-2 justify-center">
                {Object.entries(answer?.Hints)?.map(([label, value], i) =>
                    <li key={i} className={["badge bg-base-200 shadow", Math.ceil(guesses.length / 2) <= i && !gameOver ? "**:opacity-0 select-none" : ""].join(" ")}>
                        <span>
                            {label}:&nbsp;{value}
                        </span>
                    </li>
                )}
            </ul>

            <form onSubmit={e => { e.preventDefault(); onGuess(guess); }} className="w-full join shadow">
                <input type="search" placeholder="Guess an actor" disabled={guesses.length === 6 || gameOver} className="input join-item w-full" list="actors" value={guess} onChange={e => setGuess(e.target.value)} autoFocus/>
                <datalist id="actors">
                    {choices.map((a, i) => <option key={i} value={a.Name} />)}
                </datalist>
                {guess ? (
                    <button className="btn btn-accent join-item" disabled={guesses.length === 6 || gameOver}>Guess</button>
                ) : (
                    <button className="btn btn-warning join-item" disabled={guesses.length === 6 || gameOver}>Skip</button>
                )}
            </form>

            <h2><b>Guesses:</b>&nbsp;({guesses.length}/6)</h2>
            <ul className="flex flex-wrap gap-2 justify-center">
                {[...Array(6)].map((_, i) => guesses[i]?.toLowerCase() === answer.Name.toLowerCase() ? (
                    <li key={i} className="badge badge-success shadow">{guesses[i]}</li>
                ) : !["", undefined, null].includes(guesses[i]) ? (
                    <li key={i} className="badge badge-error shadow">{guesses[i]}</li>
                ) : guesses[i] === "" ? (
                    <li key={i} className="badge badge-warning shadow">Skipped</li>
                ) : (
                    <li key={i} className="badge bg-base-200 shadow">&nbsp;</li>
                ))}
            </ul>

            <button className="btn btn-error mx-auto shadow" disabled={guesses.length === 6 || gameOver} onClick={handleGiveUp}>Give up</button>
        </section>
    </>
}
