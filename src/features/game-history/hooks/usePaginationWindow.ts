import { useMemo } from 'react';

interface UsePaginationWindowInput {
  currentPage: number;
  totalPages: number;
  maxMiddlePages?: number;
}

/**
 * Builds a stable pagination model with permanent first/last pages and a sliding middle window.
 *
 * Design goals:
 * - Keep page 1 and the final page always addressable.
 * - Keep the visible middle range compact for mobile controls.
 * - Expose explicit gap flags so UI can render jump affordances (e.g. `...`) without recomputing.
 */
export default function usePaginationWindow({
  currentPage,
  totalPages,
  maxMiddlePages = 4,
}: UsePaginationWindowInput) {
  return useMemo(() => {
    const middleMin = 1;
    const middleMax = totalPages - 2;

    const middleStart =
      middleMax >= middleMin
        ? Math.max(middleMin, Math.min(currentPage - 1, middleMax - maxMiddlePages + 1))
        : middleMin;

    const middlePages =
      middleMax >= middleMin
        ? Array.from(
            { length: Math.min(maxMiddlePages, middleMax - middleStart + 1) },
            (_value, idx) => middleStart + idx,
          )
        : [];

    const hasLeftGap = middlePages.length > 0 && middlePages[0] > middleMin;
    const hasRightGap = middlePages.length > 0 && middlePages[middlePages.length - 1] < middleMax;

    return {
      middleMin,
      middleMax,
      middlePages,
      hasLeftGap,
      hasRightGap,
    };
  }, [currentPage, maxMiddlePages, totalPages]);
}
