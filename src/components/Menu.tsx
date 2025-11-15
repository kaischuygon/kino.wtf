import { FaBars } from "react-icons/fa";
import routes from "../routes";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Menu() {
    const [location, setLocation] = useState(window.location.pathname);

    return <div className="dropdown">
        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <FaBars />
        </div>
        <ul
            tabIndex={-1}
            className="menu menu-sm dropdown-content bg-base-300 rounded-box z-1 mt-3 w-max p-2 shadow">
            {routes.map(route =>
                <li>
                    <Link
                        className={["btn btn-ghost", location === route.link ? 'btn-active' : ''].join('')}
                        to={route.link}
                        onClick={() => setLocation(route.link)}
                    >
                        {route.emoji}&nbsp;{route.title}
                    </Link>
                </li>
            )}
        </ul>
    </div>
}