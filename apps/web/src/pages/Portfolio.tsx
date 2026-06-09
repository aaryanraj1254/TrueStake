import type { Bet } from "@truestake/shared";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageTransition } from "@/components/PageTransition";
import { StatCard } from "@/components/StatCard";
import { usePoll } from "@/hooks/usePoll";

type BetWithMarket = Bet & { markets?: { type?: string } };

export default function Portfolio() {
  const { data } = usePoll<BetWithMarket[]>("/api/bets/history", 60_000);
  const bets = useMemo(() => data ?? [], [data]);

  const { roiSeries, pie, byType, summary } = useMemo(() => {
    let cumulative = 0;
    const roiSeries = [...bets]
      .reverse()
      .map((b, i) => {
        cumulative += Number(b.payout) - Number(b.amount);
        return { idx: i + 1, roi: Math.round(cumulative) };
      });

    const won = bets.filter((b) => b.result === "won").length;
    const lost = bets.filter((b) => b.result === "lost").length;
    const pending = bets.filter((b) => b.result === "pending").length;
    const pie = [
      { name: "Won", value: won, color: "#22c55e" },
      { name: "Lost", value: lost, color: "#ef4444" },
      { name: "Pending", value: pending, color: "#F0B429" },
    ];

    const typeMap = new Map<string, number>();
    for (const b of bets) {
      const t = b.markets?.type ?? "other";
      typeMap.set(t, (typeMap.get(t) ?? 0) + Number(b.payout) - Number(b.amount));
    }
    const byType = [...typeMap.entries()].map(([type, profit]) => ({ type, profit: Math.round(profit) }));

    const settled = won + lost;
    const profits = bets.map((b) => Number(b.payout) - Number(b.amount));
    const summary = {
      winRate: settled ? Math.round((won / settled) * 100) : 0,
      totalProfit: Math.round(profits.reduce((a, b) => a + b, 0)),
      best: profits.length ? Math.round(Math.max(...profits)) : 0,
      worst: profits.length ? Math.round(Math.min(...profits)) : 0,
    };

    return { roiSeries, pie, byType, summary };
  }, [bets]);

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">PORTFOLIO</h1>
      <p className="mb-6 text-sm text-gray-500">Your performance, visualised</p>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Win Rate" value={summary.winRate} suffix="%" ring={summary.winRate} />
        <StatCard label="Total Profit" value={summary.totalProfit} prefix="₹" />
        <StatCard label="Best Trade" value={summary.best} prefix="₹" />
        <StatCard label="Worst Trade" value={summary.worst} prefix="₹" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="ROI OVER TIME">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={roiSeries}>
              <CartesianGrid stroke="#1a1a24" strokeDasharray="3 3" />
              <XAxis dataKey="idx" stroke="#6b6b78" fontSize={11} />
              <YAxis stroke="#6b6b78" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP} />
              <Line type="monotone" dataKey="roi" stroke="#F0B429" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="WIN / LOSS">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {pie.map((p) => (
                  <Cell key={p.name} fill={p.color} stroke="#050508" />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs">
            {pie.map((p) => (
              <span key={p.name} className="flex items-center gap-1.5 text-gray-400">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name} ({p.value})
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="PROFIT BY MARKET" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byType}>
              <CartesianGrid stroke="#1a1a24" strokeDasharray="3 3" />
              <XAxis dataKey="type" stroke="#6b6b78" fontSize={11} />
              <YAxis stroke="#6b6b78" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(240,180,41,0.05)" }} />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {byType.map((d) => (
                  <Cell key={d.type} fill={d.profit >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageTransition>
  );
}

const TOOLTIP = {
  background: "#0a0a0f",
  border: "1px solid #F0B429",
  borderRadius: 8,
  color: "#fff",
} as const;

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-gold p-5 ${className}`}>
      <h3 className="mb-4 font-heading text-lg tracking-widest text-gold">{title}</h3>
      {children}
    </div>
  );
}
