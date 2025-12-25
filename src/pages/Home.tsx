import RouteLinks from "../components/RouteLinks";

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
        <RouteLinks />
        <div className="btn btn-ghost btn-block btn-disabled">
            More games coming! Check back soon.
        </div>
    </section>
}
