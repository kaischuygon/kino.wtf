import type { ReactElement } from "react";
import Actors from "./pages/Actors";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import Directors from "./pages/Directors";

export interface Route {
    title:string, 
    emoji:string, 
    link:string, 
    component: ReactElement, 
    description: string,
    frequency: "daily"|"weekly"|null
}

const routes:Route[] = [
    { title: "home", emoji: "🍿", link: "/", component: <Home />, description: "", frequency: null},
    { title: "actors", emoji: "🎭", link: "/actors", component: <Actors />, description: "Guess the actor from their filmography.", frequency: "daily"},
    { title: "movies", emoji: "🎞️", link: "/movies", component: <Movies />, description: "Guess the movie from the castlist.", frequency: "daily"},
    { title: "directors", emoji: "🎥", link: "/directors", component: <Directors />, description: "Guess the director from their films.", frequency: "weekly"},
];

export const getRoute = (title:"actors"|"movies"|"directors"|"home") => {
    return routes.find(r => r.title === title) ?? routes[0]
}

export default routes;
