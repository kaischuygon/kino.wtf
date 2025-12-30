import { useEffect, useState } from "react";
import { getTimeUntilMidnight, getTimeUntilNextWeek, type Countdown } from "../helpers/gameHelpers";

export default function Countdown({frequency="daily"}: {frequency:"daily"|"weekly"|null}) {
    const init = frequency === "weekly" ? getTimeUntilNextWeek() : getTimeUntilMidnight();
    const [timeUntilReset, setTimeUntilReset] = useState<Countdown>(init);

    // countdown every 1 second
    useEffect(() => {
        const intervalId = setInterval(() => {
            setTimeUntilReset(init);
        }, 1000);

        return () => {
            clearInterval(intervalId);

            setTimeUntilReset(init);
        }
    }, [init]);

    return <span className="countdown font-mono text-2xl text-center">
        {timeUntilReset.days ? <>
            <span style={{"--value": timeUntilReset.days} as React.CSSProperties } aria-live="polite" aria-label="counter">0</span>d
        </> : <></>}
        <span style={{"--value": timeUntilReset.hours} as React.CSSProperties } aria-live="polite" aria-label="counter">12</span>h
        <span style={{"--value": timeUntilReset.minutes} as React.CSSProperties } aria-live="polite" aria-label="counter">59</span>m
        <span style={{"--value": timeUntilReset.seconds} as React.CSSProperties } aria-live="polite" aria-label="counter">59</span>s
    </span>
}
