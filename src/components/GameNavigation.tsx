import { FaChartBar, FaInfoCircle } from "react-icons/fa";
import useModal from "../hooks/useModal";
import { type Route } from "../routes";
import type { GameStats } from "./DisplayStats";
import DisplayStats from "./DisplayStats";

export default function GameNavigation({ stats, AboutContent, route }: { stats: GameStats, AboutContent:React.FC, route: Route }) {
    const { Modal: StatsModal, open: openStatsModal } = useModal();
    const { Modal: AboutModal, open: openAboutModal } = useModal();
    
    return <nav className="navbar">
        <div className="navbar-start">
            <button className="btn btn-circle tooltip" data-tip="Stats" onClick={() => openStatsModal()}>
                <FaChartBar />
            </button>
            <StatsModal>
                <h2 className="font-bold text-xl mb-4 text-primary"><FaChartBar className="inline" />&nbsp;Stats</h2>
                <div className="text-center">
                    <DisplayStats stats={stats} />
                </div>
            </StatsModal>
        </div>
        <h2 className="navbar-center font-display text-xl">
            {route.emoji}&nbsp;{route.title}
        </h2>
        <div className="navbar-end">
            <button className="btn btn-circle tooltip" data-tip="About" onClick={() => openAboutModal()}>
                <FaInfoCircle />
            </button>
            <AboutModal>
                <h2 className="font-bold text-xl mb-4 text-primary"><FaInfoCircle className="inline" />&nbsp;About</h2>
                <div className="flex flex-col gap-2">
                    <AboutContent />
                </div>
            </AboutModal>
        </div>
    </nav>
}
