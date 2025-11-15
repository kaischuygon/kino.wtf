import routes from "../routes";

export default function Home() {
    return <section id="homepage" className="p-2 flex flex-col gap-2">
        <h2 className="font-semibold">About</h2>
        <p className="text-sm">
            Kino is a collection of games for film buffs and casual moviegoers alike. Inspired by&nbsp;
            <a 
                className="link" 
                href="https://www.nytimes.com/games/wordle/index.html" 
                rel="noopen noreferrer" 
                target="_blank"
            >
                wordle
            </a>, but for movies.
        </p>
        <p className="text-sm">
            Play now and bookmark&nbsp;<kbd className="kbd kbd-sm">ctrl</kbd> + <kbd className="kbd kbd-sm">D</kbd>&nbsp;this page to play daily.
        </p>
        <hr className="border-base-300" />
        {routes.filter(route => route.link !== '/').map(route =>
            <a className="btn btn-block btn-xl justify-start text-left" href={route.link}>
                <div className="flex items-center gap-2">
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
