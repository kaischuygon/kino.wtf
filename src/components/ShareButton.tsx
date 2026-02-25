import { useRef } from "react";
import { type Route } from "../routes";
import { formatCamelCase } from "../helpers/gameHelpers";
import { FaCopy, FaShare } from "react-icons/fa";

export default function ShareButton({guesses, day, answer, route}: {guesses: string[], day: number, answer: string, route:Route}) {
    const button = useRef<HTMLButtonElement | null>(null);

    const game = `${route.emoji}\x20KINO\x20${formatCamelCase(route.title)}`;
    const num = `#${day}`;
    const score = [...guesses.map((g) => (
            g.trim().toLowerCase() === answer.trim().toLowerCase()
        ) ? "🟩" : (
            g.trim() === ""
        ) ? "🟨" : "🟥"
    ), ...Array(6 - guesses.length).fill("⬛")].join("");
    const guessCount = `${!guesses.map(g => g.toLowerCase().trim()).includes(answer.toLowerCase().trim()) ? "X" : guesses.length}/6`;
    const link = `🍿\x20${window.location}`;

    const result = `${game}\x20${num}\n${score}\x20${guessCount}\n${link}`;

    const canShare = () => {
        try {
            return navigator?.canShare({
                title: game,
                text: result
            });
        } catch {
            return false;
        }
    } 

    function share() {
        if (canShare()) {
            navigator?.share({
                title: game,
                text: result,
            }).catch((error) => console.error('Error sharing', error));
            return;
        } else {
            copyToClipboard()
        }

    }

    function copyToClipboard() {
        // try to use the share API

        navigator.clipboard.writeText(result)
            .then(() => {
                console.info('Copied to clipboard');
                if (button.current) {
                    // use textContent to avoid parsing HTML and ensure safe update
                    button.current.classList.add('swap-active');
                    // Reset button text after 2 seconds
                    setTimeout(() => {
                        if (button.current) {
                            button.current.classList.remove('swap-active');
                        }
                    }, 2000);
                }
            })
            .catch((error) => console.error('Error copying to clipboard', error));
    }

    return <div className="flex gap-2">
        <button ref={button} className="flex-1 btn btn-primary shadow swap" onClick={copyToClipboard}>
            <span className="swap">
                <span className="swap-off">
                    <FaCopy className="inline mr-1" />
                    Copy
                </span>
                <span className="swap-on">
                    <FaCopy className="inline mr-1" />
                    Copied!
                </span>
            </span>
        </button>
        {canShare() && (
            <button className="flex-1 btn btn-primary shadow" onClick={share}>
                <FaShare /> Share
            </button>
        )}
    </div>
}
