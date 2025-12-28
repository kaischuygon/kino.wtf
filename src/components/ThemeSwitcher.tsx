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
    const [active, setActive] = useState("");

    useEffect(() => {
        themeChange(false);
        // 👆 false parameter is required for react project
        
        // eslint-disable-next-line
        setActive(document.documentElement.getAttribute("data-theme") || "");
    }, []);

    return <div className="dropdown dropdown-end">
        <button tabIndex={0} className="btn btn-ghost btn-circle tooltip tooltip-bottom" data-tip="Change theme">
            <FaPalette />
        </button>
        <ul 
            tabIndex={-1} 
            className="menu menu-sm dropdown-content bg-base-100 z-1 w-max p-2 rounded-box shadow max-h-[50vh] overflow-auto flex-nowrap"
        >
            {themes.map((theme, i) =>
                <li key={i}>
                    <input
                        type="radio"
                        name="theme-dropdown"
                        className={["btn btn-ghost", theme === active ? "btn-active" : ""].join("\x20")}
                        aria-label={theme}
                        value={theme}
                        onClick={() => setActive(theme)}
                        data-set-theme={theme} />
                </li>
            )}
        </ul>
    </div>
}
