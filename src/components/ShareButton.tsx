import { useRef } from "react";
import { type Route } from "../routes";
import { formatCamelCase } from "../helpers/gameHelpers";

export default function ShareButton({guesses, day, answer, route}: {guesses: string[], day: number, answer: string, route:Route}) {
    const button = useRef<HTMLButtonElement | null>(null);

    const game = `${route.emoji}\x20KINO\x20${formatCamelCase(route.title)}`;
    const num = `﹟${day}`;
    const score = [...guesses.map((g) => (
            g.trim().toLowerCase() === answer.trim().toLowerCase()
        ) ? "🟩" : (
            g.trim() === ""
        ) ? "🟨" : "🟥"
    ), ...Array(6 - guesses.length).fill("⬛")].join("");
    const guessCount = `${guesses[guesses.length] !== answer.toLowerCase() ? "X" : guesses.length}/6`;
    const link = `🍿\x20${window.location}`;

    const result = `${game}\x20${num}\n${score}\x20${guessCount}\n${link}`;

    function handleClick() {
        navigator.clipboard.writeText(result)
            .then(() => {
                console.info('Copied to clipboard');
                if (button.current) {
                    // use textContent to avoid parsing HTML and ensure safe update
                    button.current.classList.add('swap-active')
                    // Reset button text after 2 seconds
                    setTimeout(() => {
                        if (button.current) {
                            button.current.classList.remove('swap-active')
                        }
                    }, 2000);
                }
            })
            .catch((error) => console.error('Error copying to clipboard', error));
    }

    return <button ref={button} className="btn btn-primary shadow swap" onClick={() => handleClick()}>
        <div className="swap-off">Share</div>
        <div className="swap-on">Copied!</div>
    </button>
}