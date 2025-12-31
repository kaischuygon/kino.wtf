import { FaBars } from "react-icons/fa";
import routes from "../routes";
import { Link } from "react-router-dom";
import { useState } from "react";
import { formatCamelCase } from "../helpers/gameHelpers";

export default function Menu() {
    const [location, setLocation] = useState(window.location.pathname);

    return <div className="dropdown dropdown-start">
        <button tabIndex={0} className="btn btn-ghost btn-square">
            <FaBars />
        </button>
        <ul
            tabIndex={-1}
            className="menu w-max dropdown-content bg-base-100 border border-base-300 z-1 p-2 rounded-field shadow max-h-[50vh] overflow-auto flex-nowrap"
        >
            {routes.map((route, i) =>
                <li key={i}>
                    <Link
                        className={["btn w-full", location === route.link ? "btn-primary" : "btn-ghost"].join("\x20")}
                        aria-label={route.title}
                        to={route.link}
                        onClick={() => setLocation(route.link)}
                    >
                        {route.emoji}&nbsp;{formatCamelCase(route.title)}
                    </Link>
                </li>
            )}
        </ul>
    </div>
}