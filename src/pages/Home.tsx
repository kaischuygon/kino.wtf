import RouteLinks from "../components/RouteLinks";

export default function Home() {
    return <section id="homepage" className="p-2 flex flex-col gap-2">
        <p className="text-sm">
            Kino.wtf is a collection of daily games for movie lovers. 
        </p>
        <p className="text-sm">
            Play now and bookmark this page to play daily.
        </p>
        <hr className="border-base-300" />
        <RouteLinks />
        <p className="text-sm text-center text-base-content mt-2">
            More games coming! Check back soon.
        </p>
    </section>
}
