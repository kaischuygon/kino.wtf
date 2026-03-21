import type { Route } from '../routes';
import type { GameMode } from './gamePersistence';

export function toGameMode(routeTitle: Route['title']): GameMode | null {
  if (routeTitle === 'actors' || routeTitle === 'movies' || routeTitle === 'directors') {
    return routeTitle;
  }

  return null;
}
