import { useEffect, useState } from 'react';
import { getTimeUntilNextRelease, type Countdown } from '../../../lib/gameRelease';

export default function Countdown({
  frequency = 'daily',
}: {
  frequency: 'daily' | 'weekly' | null;
}) {
  const period = frequency === 'weekly' ? 'weekly' : 'daily';
  const init = getTimeUntilNextRelease(period);
  const [timeUntilReset, setTimeUntilReset] = useState<Countdown>(init);

  // countdown every 1 second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeUntilReset(getTimeUntilNextRelease(period));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [period]);

  return (
    <span className="countdown font-mono text-2xl text-center">
      {timeUntilReset.days ? (
        <>
          <span
            style={{ '--value': timeUntilReset.days } as React.CSSProperties}
            aria-live="polite"
            aria-label="counter"
          >
            0
          </span>
          d
        </>
      ) : (
        <></>
      )}
      <span
        style={{ '--value': timeUntilReset.hours } as React.CSSProperties}
        aria-live="polite"
        aria-label="counter"
      >
        12
      </span>
      h
      <span
        style={{ '--value': timeUntilReset.minutes } as React.CSSProperties}
        aria-live="polite"
        aria-label="counter"
      >
        59
      </span>
      m
      <span
        style={{ '--value': timeUntilReset.seconds } as React.CSSProperties}
        aria-live="polite"
        aria-label="counter"
      >
        59
      </span>
      s
    </span>
  );
}
