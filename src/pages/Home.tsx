import routes from "../routes";

export default function Home() {
    return <section id="homepage" className="p-2 flex flex-col gap-2">
        <h2 className="font-semibold">About</h2>
        <p className="text-sm">
            Kino is a collection of games for film buffs and casual moviegoers alike. 
        </p>
        <p className="text-sm">
            Play now and bookmark this page to play daily.
        </p>
        <hr className="border-base-300" />
        {routes.filter(route => route.link !== '/').map((route, i) =>
            <a key={i} className="btn btn-block btn-xl justify-start text-left" href={route.link} >
                <div className="flex items-center gap-4">
                    <div className="text-4xl">
                        {route.emoji}
                    </div>
                    <div>
                        <h2 className="font-display">{route.title}</h2>
                        <p className="text-xs">
                            {route.description}
                        </p>
                    </div>
                </div>
            </a>
        )}
        <div className="btn btn-ghost btn-block btn-disabled">
            More games coming! Check back soon.
        </div>
    </section>
}
