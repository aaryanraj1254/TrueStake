import { useEffect, useRef, useState } from "react";

interface Options {
  duration?: number;
  decimals?: number;
}

// Animates a number from 0 → target using requestAnimationFrame + easeOutExpo.
export function useCountUp(target: number, { duration = 1500, decimals = 0 }: Options = {}): string {
  const [value, setValue] = useState(0);
  const frame = useRef<number>();
  const start = useRef<number>();

  useEffect(() => {
    start.current = undefined;
    const animate = (ts: number) => {
      if (start.current === undefined) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(target * eased);
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
