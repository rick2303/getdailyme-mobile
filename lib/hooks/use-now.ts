

import { useEffect, useState } from "react";

const TICK_MS = 60_000;

export function useNowMs(tickMs: number = TICK_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(interval);
  }, [tickMs]);

  return now;
}
