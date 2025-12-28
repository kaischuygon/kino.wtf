import { formatCamelCase } from "../helpers/gameHelpers";
import routes from "../routes";

export default function RouteLinks() {
    return routes.filter(route => ![window.location.pathname, "/"].includes(route.link)).map((route, i) =>
        <a key={i} className="btn btn-block btn-xl justify-start text-left shadow" href={route.link} >
            <div className="flex items-center gap-4">
                <div className="text-4xl">
                    {route.emoji}
                </div>
                <div>
                    <h2 className="font-display">{formatCamelCase(route.title)}</h2>
                    <p className="text-xs">
                        {route.description}
                    </p>
                </div>
            </div>
        </a>
    )
}