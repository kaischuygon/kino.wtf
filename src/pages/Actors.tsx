import { FaChartBar, FaInfoCircle } from "react-icons/fa";

import useModal from "../hooks/useModal";
import useGame from "../hooks/useGame";

import type { gameStats } from "../components/DisplayStats";

import DisplayStats from "../components/DisplayStats";

import actors from "../../get_games/actors.json";
import { routeLookup } from "../routes";

function GameNavigation({ stats }: { stats: gameStats }) {
    const { Modal: StatsModal, open: openStatsModal } = useModal();
    const { Modal: AboutModal, open: openAboutModal } = useModal();
    
    return <nav className="navbar">
        <div className="navbar-start">
            <StatsModal>
                <h2 className="font-bold text-xl mb-4 text-secondary"><FaChartBar className="inline" />&nbsp;Stats</h2>
                <div className="text-center">
                    <DisplayStats stats={stats} />
                </div>
            </StatsModal>
            <button className="btn btn-ghost btn-circle tooltip" data-tip="Stats" onClick={() => openStatsModal()}>
                <FaChartBar />
            </button>
        </div>
        <h2 className="navbar-center font-display text-xl">
            🎭&nbsp;Actors
        </h2>
        <div className="navbar-end">
            <button className="btn btn-ghost btn-circle tooltip" data-tip="About" onClick={() => openAboutModal()}>
                <FaInfoCircle />
            </button>
            <AboutModal>
                <h2 className="font-bold text-xl mb-4 text-secondary"><FaInfoCircle className="inline" />&nbsp;About</h2>
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

export default function Actors() {
    const { GameBoard, stats } = useGame({route: routeLookup("actors"), games: actors});

    return <>
        <GameNavigation stats={stats} />
        <GameBoard />
    </>
}
