import { FaChartBar, FaInfoCircle } from "react-icons/fa";

const StatsModal = () => {

    return <>
        <button className="btn btn-ghost btn-circle tooltip" data-tip="Info" onClick={() => document.getElementById('statsModal')?.showModal()}>
            <FaChartBar />
        </button>
        <dialog id="statsModal" className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Stats</h3>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </>
}

const InfoModal = () => {
    return <>
        <button className="btn btn-ghost btn-circle tooltip" data-tip="Info" onClick={() => document.getElementById('infoModal')?.showModal()}>
            <FaInfoCircle />
        </button>
        <dialog id="infoModal" className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg">🎭 Actors</h3>
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
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </>
}

export default function Actors() {

    return <>
        <nav className="navbar">
            <div className="navbar-start">
                <StatsModal />
            </div>
            <div className="navbar-center font-display">
                🎭&nbsp;Actors
            </div>
            <div className="navbar-end">
                <InfoModal />
            </div>
        </nav>
        <section id="actors" className="p-2">
            <p className="text-center">Guess the actor</p>
        </section>
    </>
}