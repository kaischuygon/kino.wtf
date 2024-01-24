import { Show, For, createEffect, on, onCleanup } from "solid-js"
import { createSignal } from "solid-js";

import Modal from "./components/modal"
import MovieSelect from "./components/movieSelect"
import AboutIcon from "~icons/bx/bxs-info-circle"
import InfoIcon from "~icons/bx/bxs-book-open"
import GitHubIcon from "~icons/bx/bxl-github"
import ChartIcon from "~icons/bx/bx-bar-chart"

import movies from '../get_movies/movies.json'

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  winPercentage: string;
  streak: number;
  maxStreak: number;
}

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  
  const hours = Math.floor(diffMs / 1000 / 60 / 60);
  const minutes = Math.floor((diffMs / 1000 / 60) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  return { hours, minutes, seconds };
}

function formatCamelCase(str: string) {
  return str
    // Insert a space before all capital letters
    .replace(/([A-Z])/g, ' $1')
    // Uppercase the first character
    .replace(/^./, str => str.toUpperCase());
}

function App() {
  // Get all movie names
  const movieNames = movies.map(movie => movie.Name + " (" + movie.Year + ")").sort()

  // Choose movie based on days since 1/15/2024
  const date = new Date()
  const start = new Date(2024, 0, 15)
  const day = Math.floor((date.getTime() - start.getTime()) / (1000 * 3600 * 24))
  const MOVIE = movies[day % movies.length]

  const [guess, setGuess] = createSignal<string>('')
  const [poster, setPoster] = createSignal<string>(MOVIE.Actors[0]['image'])
  const [guesses, setGuesses] = createSignal<string[]>([])
  const [success, setSuccess] = createSignal<boolean>(false)
  const [gameStats, setGameStats] = createSignal<GameStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    winPercentage: '0%',
    streak: 0,
    maxStreak: 0,
  });
  const [timeUntilMidnight, setTimeUntilMidnight] = createSignal(getTimeUntilMidnight());
  const [gameOver, setGameOver] = createSignal(false);

  createEffect(() => {
    const intervalId = setInterval(() => {
      setTimeUntilMidnight(getTimeUntilMidnight());
    }, 1000);

    // Cleanup the interval when the component unmounts
    onCleanup(() => {
      clearInterval(intervalId);
    });
  });

  // Load stats from localStorage when the component mounts
  createEffect(() => {
    const savedStats = localStorage.getItem('gameStats');
    if (savedStats) {
      setGameStats(JSON.parse(savedStats));
    }
  });

  // Save stats to localStorage whenever they change
  createEffect(() => {
    const stats = gameStats();
    localStorage.setItem('gameStats', JSON.stringify(stats));
  });

  // Save state to localStorage
  const saveState = () => {
    const state = {
      guesses: guesses(),
      success: success(),
      poster: gameOver() ? MOVIE.Poster : MOVIE.Actors[guesses().length]['image'], // keep poster in sync with guesses
      lastUpdated: new Date().getDate(),
      gameOver: gameOver()
    };
    localStorage.setItem('gameState', JSON.stringify(state));
  };

  // Load state from localStorage
  const loadState = () => {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.lastUpdated !== new Date().getDate()) {
        // Reset state if it was saved yesterday
        localStorage.removeItem('gameState');
        return;
      }
      setGuesses(state.guesses);
      setSuccess(state.success);
      setPoster(state.poster);
      setGameOver(state.gameOver)
    }
  };

  // Call loadState when the app starts
  loadState();

  // Call saveState whenever the state changes
  createEffect(saveState);

  // Call saveState whenever a variable changes
  createEffect(() => {
    guesses();
    success();
    poster();
    saveState();
  });

  // Copy result to clipboard
  function shareResult() {
    let score = ''
    let button = document.getElementById('shareButton')
    for (let i = 0; i < guesses().length; i++) {
      console.log(guesses()[i])
      score += guesses()[i].toLowerCase() === MOVIE.Name.toLowerCase() ? '🟩' : (guesses()[i].trim() === '' ? '🟨': '🟥')
    }
    for (let i = 0; i < 6 - guesses().length; i++) {
      score += '⬛'
    }

    let result = `📼 Kino ﹟${day % movies.length + 1}\n${score}\nhttps://www.kino.wtf`

    // Check if the Share API is supported
    // if (navigator.share) {
    //   navigator.share({
    //     text: result,
    //   })
    //     .then(() => console.log('Successful share'))
    //     .catch((error) => console.log('Error sharing', error));
    //   return;
    // } else {
      // console.log('Share API not supported')
      // Copy to clipboard
      navigator.clipboard.writeText(result)
        .then(() => {
          console.log('Copied to clipboard')
          button!.innerHTML = 'Copied!'
          // Reset button text after 2 seconds
          setTimeout(() => {
            button!.innerHTML = 'Share'
          }, 2000)
        })
        .catch((error) => console.log('Error copying to clipboard', error));
    // };
  }

  // Update stats when the game ends
  function updateStats() {
    const stats = gameStats();
    const newGamesPlayed = stats.gamesPlayed + 1;
    const newGamesWon = success() ? stats.gamesWon + 1 : stats.gamesWon;
    const newWinPercentage = String(Math.round(newGamesWon / newGamesPlayed * 100)) + '%';
    const newStreak = success() ? stats.streak + 1 : 0;
    const newMaxStreak = newStreak > stats.maxStreak ? newStreak : stats.maxStreak;
    setGameStats({
      gamesPlayed: newGamesPlayed,
      gamesWon: newGamesWon,
      winPercentage: newWinPercentage,
      streak: newStreak,
      maxStreak: newMaxStreak
    });
  }

  // Listen for guesses
  createEffect(on(guess, () => {
    if (guess()) {
      setGuesses([...guesses(), guess()]);
  
      if (guess().toLowerCase() === MOVIE.Name.toLowerCase()) {
        setPoster(MOVIE.Poster)
        setSuccess(true);
        updateStats();
        setGameOver(true);
      } else if (guesses().length === 6) {
        setPoster(MOVIE.Poster)
        setSuccess(false);
        updateStats();
        setGameOver(true);
      } else {
        setPoster(MOVIE.Actors[guesses().length]['image'])
      }
    }
  }));

  // About modal content
  const About = () => {
    return <>
      <p>
        A game for film buffs and casual moviegoers alike. Inspired by <a href="https://www.nytimes.com/games/wordle/index.html" target="_blank">wordle</a>, but for movies.
      </p>
      <p>
        Each day a new movie is chosen from a curated list, and the hints are based on the top 6 actors (in reverse order), as well as other trivia provided by the <a target="_blank" href="https://developer.themoviedb.org/reference/intro/getting-started">TMDB API</a>.
      </p>
      <p>
        Built with <a target="_blank" href="https://solidjs.com/">SolidJS</a> and <a target="_blank" href="https://tailwindcss.com/">Tailwind CSS</a>.
      </p>
    </>
  }

  // Instructions modal content
  const Instructions = () => {
    return <>
      <ul>
        <li>
          Use the hints provided to guess a film.
        </li>
        <li>
          If you guess incorrectly, another actor and/or another hint from the film will be revealed.
        </li>
        <li>
          Leave the input blank to skip a guess and get the next hint.
        </li>
        <li>
          You have 6 guesses to guess the film.
        </li>
      </ul>
    </>
  }

  // Guesses component with emojis
  const Guesses = () => {
    return <>
      <div class="p-2 font-bold">Guesses: {guesses().length} / 6</div>
      <div class="flex flex-wrap gap-2 justify-center">
        <For each={guesses()}>
          {(guess) => {
            return (
              <div class="p-2 bg-primary-700 rounded text-center shadow">
                <p><span class="font-emoji">{guess == MOVIE.Name ? '🟩'  : (guess.trim() == '' ? '🟨' : '🟥')}</span> {(guess.trim() == '' ? 'Skipped' : guess)}</p>
              </div>
            );
          }}
        </For>
      </div>
    </>
  }

  // Title component with emojis
  const Title = () => {
    return (
      <Show when={gameOver() == true} fallback={
        <div>
          <span class="font-emoji">🎞️ </span>
          Make a guess!
          <span class="font-emoji"> 🎞️</span>
        </div>
      }>
        <Show when={success() == true} fallback={
          <div>
            <span class="font-emoji">🎬 </span>
            You lost
            <span class="font-emoji"> 🎬</span>
          </div>
        }>
          <div>
            <span class="font-emoji">🎉 </span>
            You got it!
            <span class="font-emoji"> 🎉</span>
          </div>
        </Show>
      </Show>
    )
  }

  // Endscreen component with answer and share button
  const Endscreen = () => {
    return (<div class="flex flex-col gap-2 text-center w-full">
      <div>The answer was:</div>
      <div>
        <a href={`https://themoviedb.org/movie/${MOVIE["TMDb ID"]}`} class="text-lg font-bold">
          {MOVIE.Name} <span class="font-normal">({MOVIE.Year})</span>
        </a>
      </div>
      <div class="w-full font-emoji">
        <For each={guesses()}>
          {(guess) => {
            return (
              guess == MOVIE.Name ? '🟩' : (guess.trim() === '' ? '🟨' : '🟥')
            );
          }}
        </For>
        <For each={[...Array(6 - guesses().length)]}>
          {() => {
            return (
              '⬛'
            );
          }}
        </For>
      </div>
      <button class="w-min mx-auto p-2 bg-accent-400 rounded text-center shadow text-primary-950 hover:brightness-75 transition" id='shareButton' onclick={shareResult}>Share</button>
      <p>Next Game in: 
        <code>
          {String(timeUntilMidnight().hours).padStart(2, '0')}:
          {String(timeUntilMidnight().minutes).padStart(2, '0')}:
          {String(timeUntilMidnight().seconds).padStart(2, '0')}
        </code>
      </p>
    </div>)
  }

  // Change poster when hint is clicked
  const changePoster = (i: number) => {
    return () => {
      setPoster(MOVIE.Actors[i]['image'])
    }
  }

  // InProgress component with clickable actors
  const InProgress = () => {
    return (
      <div class="flex flex-col w-full h-full gap-2">
        <For each={MOVIE.Actors}>
          {(actor, i) => {
            return (
              <Show
                when={i() <= guesses().length}
                fallback={
                  <button class="hidden md:block p-2 bg-primary-800 rounded text-center w-full shadow md:h-full" disabled>
                    ...
                  </button>
                }
              >
                <Show when={actor['image'] == poster()} fallback={
                    <button class="p-2 bg-primary-700 rounded text-center w-full shadow hover:brightness-75 md:h-full" onclick={changePoster(i())}>
                      {actor['name']}
                    </button>
                }>
                  <button class="p-2 bg-accent-400 text-primary-900 rounded text-center w-full shadow hover:brightness-75 md:h-full" onclick={changePoster(i())}>
                    {actor['name']}
                  </button>
                </Show>
              </Show>
            );
          }}
        </For>
      </div>)
  }

  // Stats component with game stats
  const Stats = () => {
    return <>
      <div class="flex gap-2 justify-center flex-wrap" >
        <For each={Object.entries(gameStats())}>
          {([key, value]) => {
            return (
              <div class="p-2 bg-primary-700 rounded text-center shadow flex flex-col justify-center items-center">
                <span class="text-xl font-bold block">{value}</span>
                <span class="text-xs block">{formatCamelCase(key)}</span>
              </div>
            );
          }}
        </For>
      </div>
    </>
  }

  // Hints component with hints revealed every 2 guesses
  const Hints = () => {
    return (
    <>
    <Show when={!success() && guesses().length < 6}>
      <div class="p-2 font-bold">Hints: {Math.ceil(guesses().length / 2)} / 3</div>
      <div class="flex flex-wrap gap-2 justify-center">
          <Show when={guesses().length >= 3}>
            <div class="p-2 bg-primary-700 rounded text-center shadow">
              <p><strong>Genre{MOVIE.Hints.Genres.split(',').length > 1 ? 's' : ''}</strong>: {MOVIE.Hints.Genres}</p>
            </div>
          </Show>
          <Show when={guesses().length >= 1}>
              <div class="p-2 bg-primary-700 rounded text-center shadow">
              <p><strong>Director:</strong> {MOVIE.Hints.Director}</p>
            </div>
          </Show>
          <Show when={guesses().length >= 5}>
            <div class="p-2 bg-primary-700 rounded text-center shadow">
              <p><strong>Release year:</strong> {MOVIE.Hints["Release Year"]}</p>
            </div>
          </Show>
      </div>
    </Show>
    </>
    )
  }

  // GameScreen component with title, poster, and stats
  const GameScreen = () => {
    return (
      <>
        <div class="text-center w-full">
          <p class='my-1 text-3xl font-bold'>
            <Title />
          </p>
          <Hints />
          <div class="flex flex-col md:flex-row items-center md:aspect-[16/9] my-2 gap-2">
            <img 
              src={poster()} alt={guesses().length != 6 ? MOVIE.Actors[guesses().length]['name'] : MOVIE.Name} 
              class="object-cover rounded mx-auto max-h-[300px] md:max-h-none md:aspect-[2/3] md:h-full" 
            />
            <Show when={gameOver() == true} fallback={
              <InProgress />
              }>
                <Endscreen />
            </Show>
          </div>
          <hr class="border-accent-400" />
          <div class="mt-2" >
            <Show when={gameOver() == true} fallback={
              <MovieSelect guess={guess} setGuess={setGuess} options={movieNames} />
            }>
              <Stats />
            </Show>
          </div>
          <Show when={guesses().length > 0}>
            <div class='mt-2'>
              <Guesses />
            </div>
          </Show>
        </div>
      </>
    );
  };

  // Footer component with links
  const Footer = () => {
    return (
      <div class="flex flex-wrap text-xs text-primary-300 m-2 gap-2 justify-center">
        <p>© 2023 <a target="_blank" href="https://kaischuyler.com">Kai Schuyler</a></p>
        <span>·</span>
        <span>
          <span>☕️ </span>
          <a href="https://www.buymeacoffee.com/kaischuyler" target="_blank">
            Buy me a coffee
          </a>
        </span>
        <span>·</span>
        <span class="inline">
          <GitHubIcon class="text-primary-100 inline mr-1" />
          <a target="_blank" href="https://github.com/kaischuygon/kino.wtf">
            source
          </a>
        </span>
        <span>·</span>
        <span class="inline">
          <a target="_blank" href="https://github.com/kaischuygon/kino.wtf/issues">
            issues?
          </a>
        </span>
      </div>
    )
  }

  // GiveUp button
  const GiveUp = () => {
    return (
      <button class="mx-auto p-2 bg-accent-400 rounded text-center shadow text-primary-950 hover:brightness-75 transition" onclick={() => {
        setPoster(MOVIE.Poster)
        setSuccess(false);
        updateStats();
        setGameOver(true);
      }}>Give up</button>
    )
  }

  return (
    <>
      <div class="w-screen bg-primary-900 text-primary-100">
        <div class="p-2 max-w-screen-sm 2xl:1/3 mx-auto flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <div class="font-emoji text-4xl">📼</div>
            <h1 class="text-4xl font-bold text-center text-accent-400 font-display">
            KINO
            </h1>
            <div class="flex gap-2 justify-center items-center ml-auto">
              <Modal Icon={AboutIcon} title="About" >
                <About />
              </Modal>
              <Modal Icon={InfoIcon} title="How to play">
                <Instructions />
              </Modal>
              <Modal Icon={ChartIcon} title="Stats">
                <Stats />
              </Modal>
            </div>
          </div>

          <hr class="border-accent-400"/>

          <GameScreen />
          <Show when={gameOver() == false}>
            <GiveUp />
          </Show>

          <Footer />
        </div>
      </div>
    </>
  )
}

export default App
