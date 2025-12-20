import ThemeSwitcher from "./ThemeSwitcher";
import Menu from "./Menu";

export default function Navbar() {
    return <nav className="navbar border rounded-box border-base-300 bg-base-200">
        <div className="navbar-start">
            <Menu />
        </div>
        <div className="navbar-center">
            <a className="btn btn-ghost text-xl font-display" href="/">🍿 Kino.wtf</a>
        </div>
        <div className="navbar-end">
            <ThemeSwitcher />
        </div>
    </nav>
}
