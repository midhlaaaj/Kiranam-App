'use client';

import { useEffect, useRef, useState } from 'react';

const NUMERIC_PATTERN = /^(₹?)([\d,]+)$/;

/** Animates a numeric stat value from 0 to its target on mount. Falls back to
 * rendering the raw string immediately for non-numeric values (dates, "Enabled",
 * "—", etc.) and skips the animation entirely under prefers-reduced-motion. */
export function CountUpValue({ value }: { value: string }) {
  const match = value.match(NUMERIC_PATTERN);
  const target = match ? Number(match[2].replace(/,/g, '')) : null;
  const [display, setDisplay] = useState(target === null ? value : '0');
  const started = useRef(false);

  useEffect(() => {
    if (target === null || started.current) return;
    started.current = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefix = match![1];

    if (reduceMotion) {
      requestAnimationFrame(() => setDisplay(value));
      return;
    }

    const duration = 500;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round((target as number) * eased);
      setDisplay(prefix + current.toLocaleString('en-IN'));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <>{display}</>;
}
