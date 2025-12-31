import { formatCamelCase } from "../helpers/gameHelpers";
import routes from "../routes";

export default function RouteLinks() {
    return routes.filter(route => ![window.location.pathname, "/"].includes(route.link)).map((route, i) =>
        <a key={i} className="btn btn-block btn-xl justify-start text-left shadow h-full p-2 font-normal" href={route.link} >
            <div className="flex items-center gap-2 w-full">
                <div className="text-4xl">
                    {route.emoji}
                </div>
                <div className="w-full">
                    <div className="flex gap-1 justify-between">
                        <h2 className="font-display">{formatCamelCase(route.title)}</h2>
                        {route.frequency !== null ? (
                            <div className={["badge badge-sm", route.frequency === "daily" ? "badge-primary" : "badge-secondary"].join("\x20")}>
                                {formatCamelCase(route.frequency)}
                            </div>
                        ) : <></>}
                    </div>
                    <p className="text-xs">
                        {route.description}
                    </p>
                </div>
            </div>
        </a>
    )
}
