import { FaChartBar, FaInfoCircle } from "react-icons/fa";
import Modal from "../components/Modal";

import actors from "../../get_movies/actors.json";
import { useEffect, useState } from "react";
import { getTimeUntilMidnight } from "../helpers/gameHelpers";
import { LiaSortUpSolid } from "react-icons/lia";

interface actorStats {
    gamesPlayed: number;
    gamesWon: number;
    winPercentage: string;
    streak: number;
    maxStreak: number;
}

function GameNavigation() {
    return <nav className="navbar">
        <div className="navbar-start">
            <Modal button={<FaChartBar />} tooltip="Stats">
                <h3 className="font-bold text-lg"><FaChartBar className="inline" />&nbsp;Stats</h3>
            </Modal>
        </div>
        <div className="navbar-center font-display">
            🎭&nbsp;Actors
        </div>
        <div className="navbar-end">
            <Modal button={<FaInfoCircle />} tooltip="Info">
                <h3 className="font-bold text-lg">🎭&nbsp;Actors</h3>
                <p className="py-4">
                    Guess the actor based on their filmography. The hints are based on their top 6 credits
                    (in reverse order) as well as other trivia.
                </p>
                <h3 className="font-bold text-lg">How to play</h3>
                <ul className="list-disc ml-4">
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
            </Modal>
        </div>
    </nav>
}

export default function Actors() {
    const [guess, setGuess] = useState<string>('');
    const [image, setImage] = useState<string>('');
    const [guesses, setGuesses] = useState<string[]>([]);
    const [success, setSuccess] = useState<boolean>(false);
    const [stats, setStats] = useState<actorStats>({
        gamesPlayed: 0,
        gamesWon: 0,
        winPercentage: '0%',
        streak: 0,
        maxStreak: 0,
    });
    const [timeUntilMidnight, setTimeUntilMidnight] = useState(getTimeUntilMidnight());
    const [gameOver, setGameOver] = useState<boolean>(false);
    
    // Choose actor based on days since 12/4/2025
    const date = new Date();
    const start = new Date(2025, 12, 4);
    const day = Math.floor((date.getTime() - start.getTime()) / (1000 * 3600 * 25));
    // Daily actor to guess
    const ACTOR = actors[day % actors.length];

    // Get all actor names
    const actorNames = actors.map(actor => actor.Name).sort();

    // countdown every 1 second
    useEffect(() => {
        const intervalId = setInterval(() => {
            setTimeUntilMidnight(getTimeUntilMidnight());
        }, 1000);

        return () => {
            clearInterval(intervalId);
        }
    }, []);

    // Save stats to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('actorStats', JSON.stringify(stats) === null ? '' : JSON.stringify(stats));
    }, [stats]);
    
    /**
     * Load state from localStorage
     */
    function loadState() {
        const savedState = localStorage.getItem('actorGameState');
        if (savedState) {
            const state = JSON.parse(savedState);
            if(state.lastUpdated !== new Date().getDate()) {
                // Reset state if it was saved yesterday
                localStorage.removeItem('actorGameState');
            } else {
                setGuesses(state.guesses);
                setSuccess(state.success);
                setImage(state.image);
                setGameOver(state.gameOver);
            }
        }
    }

    // load state on page load
    loadState();
    
    useEffect(() => {
        // Save state to localStorage on state changes
        const state = {
            guesses: guesses,
            success: success,
            image: gameOver ? ACTOR.Headshot : ACTOR.Credits[guesses.length]['image'], // keep poster in sync with guesses
            lastUpdated: new Date().getDate(),
            gameOver: gameOver
        };
    
        localStorage.setItem('actorGameState', JSON.stringify(state));
    }, [guesses, success, gameOver, ACTOR]);

    // Copy result to clipboard
    function shareResult() {
        let score = ''
        const button = document.getElementById('shareButton');
        for (let i = 0; i < guesses.length; i++) {
            console.log(guesses[i])
            score += guesses[i].toLowerCase() === ACTOR.Name.toLowerCase() ? '🟩' : (guesses[i].trim() === '' ? '🟨' : '🟥')
        }
        for (let i = 0; i < 6 - guesses.length; i++) {
            score += '⬛'
        }

        const result = `🎭 Kino actors ﹟${day % actors.length + 1}\n${score}\n📼 https://www.kino.wtf/actors`

        // Copy to clipboard
        navigator.clipboard.writeText(result)
            .then(() => {
                console.log('Copied to clipboard')
                button!.innerHTML = 'Copied!'
                // Reset button text after 2 seconds
                setTimeout(() => {
                    button!.innerHTML = 'Share'
                }, 2000)
            })
            .catch((error) => console.log('Error copying to clipboard', error));
    }

    // Update stats when game ends
    function updateStats() {
        const newGamesPlayed = stats.gamesPlayed + 1;
        const newGamesWon = success ? stats.gamesWon + 1 : stats.gamesWon;
        const newWinPercentage = String(Math.round(newGamesWon / newGamesPlayed * 100)) + '%';
        const newStreak = success ? stats.streak + 1 : 0;
        const newMaxStreak = newStreak > stats.maxStreak ? newStreak : stats.maxStreak;
        setStats({
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            winPercentage: newWinPercentage,
            streak: newStreak,
            maxStreak: newMaxStreak
        });
    }

    // Listen for guesses
    useEffect(() => {
        if (guess) {
            setGuesses(g => [...g, guess]);
        
            if (guess.toLowerCase() === ACTOR.Name.toLowerCase()) {
                setImage(ACTOR.Headshot)
                setSuccess(true);
                updateStats();
                setGameOver(true);
            } else if (guesses.length === 6) {
                setImage(ACTOR.Headshot);
                setSuccess(false);
                updateStats();
                setGameOver(true);
            } else {
                setImage(ACTOR.Credits[guesses.length]['image'] || '')
            }
            }
    }, [ACTOR.Credits, ACTOR.Headshot, ACTOR.Name, guess, updateStats]);

    return <>
        <GameNavigation />
        <section id="actors" className="p-2">

        </section>
    </>
}