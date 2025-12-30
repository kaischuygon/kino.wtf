import useGame from "../hooks/useGame";

import movies from "../../get_games/movies.json";
import { getRoute } from "../routes";
import GameNavigation from "../components/GameNavigation";

export default function Movies() {
    const { GameBoard, stats } = useGame({route: getRoute("movies"), games: movies});

    const AboutContent = () => {
        return <>
            <p>
                Guess the movie based on the castlist. The hints are based on the top 6 billed actors
                (in reverse order) as well as other trivia.
            </p>
            <h3 className="font-bold text-lg">How to play</h3>
            <ul className="list-disc ml-8">
                <li>
                    Use the hints provided to guess a movie.
                </li>
                <li>
                    If you guess incorrectly, another actor and/or another hint will be revealed.
                </li>
                <li>
                    Leave the input blank to skip a guess and get the next hint.
                </li>
                <li>
                    You have 6 guesses to guess the movie.
                </li>
            </ul>
        </>
    };

    return <>
        <GameNavigation stats={stats} AboutContent={AboutContent} route={getRoute("movies")} />
        <GameBoard />
    </>
}
