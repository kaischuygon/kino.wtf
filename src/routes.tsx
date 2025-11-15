import Actors from "./pages/Actors";
import Home from "./pages/Home";
import Movies from "./pages/Movies";

const routes = [
    { title: "Home", emoji: "🍿", link: "/", component: <Home />, description: "" },
    { title: "Actors", emoji: "🎭", link: "/actors", component: <Actors />, description: "Guess the actor from their filmography." },
    { title: "Movies", emoji: "🎞️", link: "/movies", component: <Movies />, description: "Guess the movie from the castlist." },
    { title: "Directors", emoji: "🎥", link: "/directors", component: <Movies />, description: "Guess the director from their films." }
];

export default routes;
