import { FaChartBar, FaInfoCircle, FaTrophy } from 'react-icons/fa';
import useModal from '../../../hooks/useModal';
import { type Route } from '../../../routes';
import type { GameStats } from './DisplayStats';
import DisplayStats from './DisplayStats';
import GameHistoryModal from '../../game-history/components/GameHistoryModal';
import useAuth from '../../../hooks/useAuth';
import { toGameMode } from '../../../lib/gameMode';
import GameLeaderboard from './GameLeaderboard';

export default function GameNavigation({
  stats,
  AboutContent,
  route,
  gameIndex,
  onOpenLeaderboard,
  showInlineLeaderboardModal = true,
}: {
  stats: GameStats;
  AboutContent: React.FC;
  route: Route;
  gameIndex: number;
  onOpenLeaderboard?: () => void;
  showInlineLeaderboardModal?: boolean;
}) {
  const { user, isConfigured } = useAuth();
  const gameMode = toGameMode(route.title);
  const { Modal: StatsModal, open: openStatsModal } = useModal();
  const { Modal: LeaderboardModal, open: openLeaderboardModal } = useModal();
  const { Modal: AboutModal, open: openAboutModal } = useModal();

  return (
    <nav className="navbar p-0">
      <div className="navbar-start">
        <button
          className="btn btn-ghost btn-square tooltip tooltip-right sm:tooltip-top"
          data-tip="Stats"
          onClick={() => openStatsModal()}
        >
          <FaChartBar />
        </button>
        <StatsModal>
          <h2 className="font-bold text-xl mb-4 text-primary">
            <FaChartBar className="inline" />
            &nbsp;Stats
          </h2>
          <div className="text-center">
            <DisplayStats stats={stats} />
          </div>
        </StatsModal>
        {gameMode ? (
          <>
            <button
              className="btn btn-ghost btn-square tooltip tooltip-right sm:tooltip-top"
              data-tip="Leaderboard"
              onClick={() => (onOpenLeaderboard ? onOpenLeaderboard() : openLeaderboardModal())}
            >
              <FaTrophy />
            </button>
            {showInlineLeaderboardModal ? (
              <LeaderboardModal>
                <h2 className="font-bold text-xl mb-4 text-primary">
                  <FaTrophy className="inline" />
                  &nbsp;Leaderboard
                </h2>
                <GameLeaderboard
                  enabled={isConfigured}
                  gameMode={gameMode}
                  gameIndex={gameIndex}
                  userId={user?.id ?? null}
                  pageSize={25}
                  showPagination
                  showTitle={false}
                />
              </LeaderboardModal>
            ) : null}
          </>
        ) : null}
      </div>
      <h2 className="navbar-center font-display text-lg">
        {route.emoji}&nbsp;{route.title}&nbsp;#{gameIndex + 1}
      </h2>
      <div className="navbar-end">
        <GameHistoryModal />
        <button
          className="btn btn-ghost btn-square tooltip tooltip-left sm:tooltip-top"
          data-tip="About"
          onClick={() => openAboutModal()}
        >
          <FaInfoCircle />
        </button>
        <AboutModal>
          <h2 className="font-bold text-xl mb-4 text-primary">
            <FaInfoCircle className="inline" />
            &nbsp;About
          </h2>
          <div className="flex flex-col gap-2">
            <AboutContent />
          </div>
        </AboutModal>
      </div>
    </nav>
  );
}
