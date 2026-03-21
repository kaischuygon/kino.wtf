import usePaginationWindow from '../hooks/usePaginationWindow';

interface GameHistoryPaginationProps {
  safePage: number;
  pageCount: number;
  setPage: (page: number) => void;
}

export default function GameHistoryPagination({
  safePage,
  pageCount,
  setPage,
}: GameHistoryPaginationProps) {
  const { middleMin, middlePages, hasLeftGap, hasRightGap } = usePaginationWindow({
    currentPage: safePage,
    totalPages: pageCount,
    maxMiddlePages: 4,
  });

  return (
    <div className="join">
      <button
        type="button"
        className={['join-item btn btn-xs', safePage === 0 ? 'btn-active' : ''].join(' ')}
        onClick={() => setPage(0)}
        disabled={safePage === 0}
        aria-label="Go to page 1"
      >
        1
      </button>
      {hasLeftGap ? (
        <button
          type="button"
          className="join-item btn btn-xs"
          onClick={() => setPage(Math.max(middleMin, middlePages[0] - 1))}
          aria-label="Jump backward"
        >
          ...
        </button>
      ) : null}
      {middlePages.map((pageIndex) => (
        <button
          key={pageIndex}
          type="button"
          className={['join-item btn btn-xs', pageIndex === safePage ? 'btn-active' : ''].join(' ')}
          onClick={() => setPage(pageIndex)}
          disabled={pageIndex === safePage}
          aria-label={`Go to page ${pageIndex + 1}`}
        >
          {pageIndex + 1}
        </button>
      ))}
      {hasRightGap ? (
        <button
          type="button"
          className="join-item btn btn-xs"
          onClick={() => setPage(Math.min(pageCount - 2, middlePages[middlePages.length - 1] + 1))}
          aria-label="Jump to more pages"
        >
          ...
        </button>
      ) : null}
      {pageCount > 1 ? (
        <button
          type="button"
          className={['join-item btn btn-xs', safePage === pageCount - 1 ? 'btn-active' : ''].join(
            ' ',
          )}
          onClick={() => setPage(pageCount - 1)}
          disabled={safePage === pageCount - 1}
          aria-label={`Go to last page ${pageCount}`}
        >
          {pageCount}
        </button>
      ) : null}
    </div>
  );
}
