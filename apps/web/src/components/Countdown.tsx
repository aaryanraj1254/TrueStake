import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    done: ms === 0,
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ to, compact = false }: { to: string | number; compact?: boolean }) {
  const target = typeof to === "string" ? new Date(to).getTime() : to;
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t.done) return <span className="text-lose">Closed</span>;

  if (compact) {
    return (
      <span className="font-mono text-gold">
        {t.d > 0 && `${t.d}d `}
        {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
      </span>
    );
  }

  return (
    <div className="flex gap-2 font-mono">
      {t.d > 0 && <Unit value={t.d} label="d" />}
      <Unit value={t.h} label="h" />
      <Unit value={t.m} label="m" />
      <Unit value={t.s} label="s" />
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[44px] flex-col items-center rounded-lg border border-gold/20 bg-dark-800 px-2 py-1">
      <span className="text-lg text-gold">{pad(value)}</span>
      <span className="text-[10px] uppercase text-gray-500">{label}</span>
    </div>
  );
}
