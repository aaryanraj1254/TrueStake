import { useCountUp } from "@/hooks/useCountUp";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  ring?: number; // 0-100, renders a circular SVG progress ring
}

export function StatCard({ label, value, prefix = "", suffix = "", decimals = 0, ring }: StatCardProps) {
  const display = useCountUp(value, { decimals });

  return (
    <div className="glass-gold shimmer p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400">{label}</div>
          <div className="mt-2 font-heading text-3xl text-gold-gradient">
            {prefix}
            {display}
            {suffix}
          </div>
        </div>
        {ring !== undefined && <Ring value={ring} />}
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(Math.max(value, 0), 100) / 100) * circ;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#1a1a24" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="#F0B429"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="32" y="34" textAnchor="middle" className="rotate-90" fill="#F0B429" fontSize="13" transform="rotate(90 32 32)">
        {Math.round(value)}%
      </text>
    </svg>
  );
}
