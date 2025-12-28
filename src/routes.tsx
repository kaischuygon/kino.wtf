import type { ReactElement } from "react";
import Actors from "./pages/Actors";
import Home from "./pages/Home";
import Movies from "./pages/Movies";

export interface Route {
    title:string, 
    emoji:string, 
    link:string, 
    component: ReactElement, 
    description: string
}

const routes:Route[] = [
    { title: "home", emoji: "🍿", link: "/", component: <Home />, description: "" },
    { title: "actors", emoji: "🎭", link: "/actors", component: <Actors />, description: "Guess the actor from their filmography." },
    { title: "movies", emoji: "🎞️", link: "/movies", component: <Movies />, description: "Guess the movie from the castlist." },
    { title: "directors", emoji: "🎥", link: "/directors", component: <Movies />, description: "Guess the director from their films." }
];

export const routeLookup = (title:string) => {
    return routes.find(r => r.title === title) ?? routes[0]
}

export default routes;
