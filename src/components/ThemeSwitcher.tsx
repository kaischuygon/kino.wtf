import { useEffect, useState } from 'react';
import { FaPalette } from 'react-icons/fa';
import { themeChange } from 'theme-change';

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

export default function ThemeSwitcher() {
    const [active, setActive] = useState(localStorage.getItem("theme") || "");

    useEffect(() => {
        themeChange(false);
        // 👆 false parameter is required for react project
    }, []);

    return <div className="dropdown dropdown-end">
        <button tabIndex={0} className="btn btn-ghost btn-circle tooltip tooltip-bottom" data-tip="Change theme">
            <FaPalette />
        </button>
        <ul
            tabIndex={-1}
            className="menu menu-sm w-max dropdown-content bg-base-100 z-1 p-2 rounded-field shadow max-h-[50vh] overflow-auto flex-nowrap"
        >
            {themes.map((theme, i) =>
                <li key={i}>
                    <button
                        className={["btn btn-sm w-full", theme === active ? "btn-primary" : "btn-ghost"].join("\x20")}
                        aria-label={theme}
                        value={theme}
                        onClick={() => {
                            document.documentElement.setAttribute("data-theme", theme);
                            localStorage.setItem("theme", theme);
                            setActive(theme);
                        }}
                    >
                        <div data-theme={theme} className="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded-field p-1 border border-base-300">
                            <div className="bg-base-content size-1 rounded-selector" />
                            <div className="bg-primary size-1 rounded-selector" />
                            <div className="bg-secondary size-1 rounded-selector" />
                            <div className="bg-accent size-1 rounded-selector" />
                        </div>
                        {theme}
                    </button>
                </li>
            )}
        </ul>
    </div>
}
