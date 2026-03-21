export interface Route {
  title: string;
  emoji: string;
  link: string;
  description: string;
  frequency: 'daily' | 'weekly' | null;
}

const routes: Route[] = [
  { title: 'home', emoji: '🍿', link: '/', description: '', frequency: null },
  {
    title: 'actors',
    emoji: '🎭',
    link: '/actors',
    description: 'Guess the actor from their filmography.',
    frequency: 'daily',
  },
  {
    title: 'movies',
    emoji: '🎞️',
    link: '/movies',
    description: 'Guess the movie from the castlist.',
    frequency: 'daily',
  },
  {
    title: 'directors',
    emoji: '🎥',
    link: '/directors',
    description: 'Guess the director from their films.',
    frequency: 'weekly',
  },
];

export const getRoute = (title: 'actors' | 'movies' | 'directors' | 'home') => {
  return routes.find((r) => r.title === title) ?? routes[0];
};

export default routes;
