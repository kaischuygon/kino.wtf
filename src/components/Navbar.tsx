import ThemeSwitcher from "./ThemeSwitcher";
import Menu from "./Menu";
import { getRoute } from "../routes";
import { Link } from "@tanstack/react-router";

export default function Navbar() {
    return <nav className="navbar border rounded-box border-base-300 bg-base-200 w-full">
        <div className="navbar-start">
            <Menu />
        </div>
        <div className="navbar-center">
            <Link className="btn btn-ghost text-xl font-display" to="/">
                {getRoute('home').emoji}&nbsp;Kino.wtf
            </Link>
        </div>
        <div className="navbar-end">
            <ThemeSwitcher />
        </div>
    </nav>
}
