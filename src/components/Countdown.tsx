import { useEffect, useState } from "react";
import { getTimeUntilMidnight, type Countdown } from "../helpers/gameHelpers";

export default function Countdown() {
    const [timeUntilMidnight, setTimeUntilMidnight] = useState<Countdown>(getTimeUntilMidnight());

    // countdown every 1 second
    useEffect(() => {
        const intervalId = setInterval(() => {
            setTimeUntilMidnight(getTimeUntilMidnight());
        }, 1000);

        return () => {
            clearInterval(intervalId);

            setTimeUntilMidnight(getTimeUntilMidnight());
        }
    }, []);

    return <>
        <p>
            Next game in:
        </p>
        <span className="countdown font-mono text-2xl text-center">
            <span style={{"--value": timeUntilMidnight.hours} as React.CSSProperties } aria-live="polite" aria-label="counter">12</span>h
            <span style={{"--value": timeUntilMidnight.minutes} as React.CSSProperties } aria-live="polite" aria-label="counter">59</span>m
            <span style={{"--value": timeUntilMidnight.seconds} as React.CSSProperties } aria-live="polite" aria-label="counter">59</span>s
        </span>
    </>
}
