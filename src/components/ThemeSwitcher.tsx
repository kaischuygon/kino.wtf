import { useEffect, useState } from 'react';
import { FaPalette } from 'react-icons/fa';
import { themeChange } from 'theme-change';

const themes = [
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'caramellatte',
  'abyss',
  'silk',
];

interface ThemeSwitcherProps {
  onThemeChange?: (theme: string) => Promise<void> | void;
  activeTheme?: string | null;
  disabled?: boolean;
  loading?: boolean;
}

export default function ThemeSwitcher({
  onThemeChange,
  activeTheme = null,
  disabled = false,
  loading = false,
}: ThemeSwitcherProps) {
  const [active, setActive] = useState('');
  const selectedTheme = activeTheme ?? active;

  useEffect(() => {
    themeChange(false);
    const nextTheme =
      typeof window !== 'undefined'
        ? localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || ''
        : '';

    if (nextTheme) {
      const timeoutId = window.setTimeout(() => {
        setActive(nextTheme);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    // 👆 false parameter is required for react project
  }, []);

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-square tooltip tooltip-left sm:tooltip-bottom"
        data-tip="Change theme"
        disabled={disabled || loading}
      >
        {loading ? <span className="loading loading-spinner loading-sm" /> : <FaPalette />}
      </button>
      <ul
        tabIndex={-1}
        className="menu menu-sm w-max dropdown-content bg-base-100 border border-base-300 z-1 p-2 rounded-field shadow max-h-[50vh] overflow-auto flex-nowrap"
      >
        {themes.map((theme, i) => (
          <li key={i}>
            <button
              className={[
                'btn btn-sm w-full',
                theme === selectedTheme ? 'btn-primary' : 'btn-ghost',
              ].join('\x20')}
              aria-label={theme}
              value={theme}
              onClick={async () => {
                if (typeof document === 'undefined') return;
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                setActive(theme);
                await onThemeChange?.(theme);
              }}
              disabled={disabled || loading}
            >
              <div
                data-theme={theme}
                className="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded-field p-1 border border-base-300"
              >
                <div className="bg-base-content size-1 rounded-selector" />
                <div className="bg-primary size-1 rounded-selector" />
                <div className="bg-secondary size-1 rounded-selector" />
                <div className="bg-accent size-1 rounded-selector" />
              </div>
              {theme}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
