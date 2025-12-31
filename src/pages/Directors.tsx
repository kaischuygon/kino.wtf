import useGame from "../hooks/useGame";

import directors from "../../get_games/directors.json";
import { getRoute } from "../routes";
import GameNavigation from "../components/GameNavigation";
import useGameIndex from "../hooks/useGameIndex";

export default function Directors() {
    const route = getRoute("directors");
    // `useGameIndex` updates automatically at midnight/weekly boundary and
    // when storage events occur. For dev testing, see README or use
    // `window.__simulateNextBoundary()` in the browser console on this page.
    const gameIndex = useGameIndex(route);
    const { GameBoard, stats } = useGame(route, directors, gameIndex);

    const AboutContent = () => {
        return <>
            <p>
                Guess the director based on their filmography. The hints are based on their top 6 directing credits
                (in reverse order) as well as other trivia.
            </p>
            <h3 className="font-bold text-lg">How to play</h3>
            <ul className="list-disc ml-8">
                <li>
                    Use the hints provided to guess a director.
                </li>
                <li>
                    If you guess incorrectly, another credit and/or another hint will be revealed.
                </li>
                <li>
                    Leave the input blank to skip a guess and get the next hint.
                </li>
                <li>
                    You have 6 guesses to guess the director.
                </li>
            </ul>
        </>
    }

    return <section id="directors" className="p-2">
        <GameNavigation stats={stats} AboutContent={AboutContent} route={getRoute("directors")} />
        <GameBoard />
    </section>
}
