import useGame from "../hooks/useGame";

import actors from "../../get_games/actors.json";
import { getRoute } from "../routes";
import GameNavigation from "../components/GameNavigation";
import useGameIndex from "../hooks/useGameIndex";

export default function Actors() {
    const route = getRoute("actors");
    // `useGameIndex` updates automatically at midnight/weekly boundary and
    // when storage events occur. For dev testing, see README or use
    // `window.__simulateNextBoundary()` in the browser console on this page.
    const gameIndex = useGameIndex(route);

    const { GameBoard, stats } = useGame(route, actors, gameIndex);

    const AboutContent = () => {
        return <>
            <p>
                Guess the actor based on their filmography. The hints are based on their top 6 acting credits
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
        </>
    }

    return <section id="actors" className="p-2">
        <GameNavigation stats={stats} AboutContent={AboutContent} route={getRoute("actors")} />
        <GameBoard />
    </section>
}
