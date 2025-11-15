import { useEffect } from 'react';
import { FaPalette } from 'react-icons/fa';
import { themeChange } from 'theme-change';

export default function ThemeSwitcher() {
    const themes = [
        "light",
        "dark",
        "cupcake",
        "bumblebee",
        "emerald",
        "corporate",
        "synthwave",
        "retro",
        "cyberpunk",
        "valentine",
        "halloween",
        "garden",
        "forest",
        "aqua",
        "lofi",
        "pastel",
        "fantasy",
        "wireframe",
        "black",
        "luxury",
        "dracula",
        "cmyk",
        "autumn",
        "business",
        "acid",
        "lemonade",
        "night",
        "coffee",
        "winter",
        "dim",
        "nord",
        "sunset",
        "caramellatte",
        "abyss",
        "silk"
    ]

    useEffect(() => {
        themeChange(false);
        // 👆 false parameter is required for react project
    }, []);

    return <div className="dropdown dropdown-end">
        <button tabIndex={0} className="btn btn-ghost btn-circle tooltip tooltip-bottom" data-tip="Change theme">
            <FaPalette />
        </button>
        <ul tabIndex={-1} className="dropdown-content bg-base-300 text-base-content rounded-box z-1 w-max p-2 shadow-2xl max-h-96 overflow-scroll">
            {themes.map((theme, i) =>
                <li key={i}>
                    <input
                        type="radio"
                        name="theme-dropdown"
                        className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start"
                        aria-label={theme}
                        value={theme}
                        data-set-theme={theme} />
                </li>
            )}
        </ul>
    </div>
}
