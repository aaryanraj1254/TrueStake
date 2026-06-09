import type { CopyTrade, LeaderboardEntry } from "@truestake/shared";
import { useEffect, useState } from "react";
import { AchievementBadges } from "@/components/AchievementBadges";
import { Countdown } from "@/components/Countdown";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { usePoll } from "@/hooks/usePoll";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";

function nextMonthReset(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

export default function Leaderboard() {
  const { data } = usePoll<LeaderboardEntry[]>("/api/leaderboard", 60_000);
  const { user } = useAuth();
  const { toast } = useToast();
  const [copying, setCopying] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<CopyTrade[]>("/api/copy")
      .then((list) => setCopying(new Set(list.filter((c) => c.active).map((c) => c.trader_id))))
      .catch(() => {});
  }, []);

  async function toggleCopy(traderId: string) {
    const next = !copying.has(traderId);
    setCopying((prev) => {
      const s = new Set(prev);
      next ? s.add(traderId) : s.delete(traderId);
      return s;
    });
    try {
      await api.post("/api/copy", { traderId, active: next });
      toast(next ? "Now copying this trader's bets" : "Stopped copying", next ? "success" : "info");
    } catch (e) {
      // revert on failure
      setCopying((prev) => {
        const s = new Set(prev);
        next ? s.delete(traderId) : s.add(traderId);
        return s;
      });
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  }

  const rows = data ?? [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <PageTransition>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-wide text-gray-100">LEADERBOARD</h1>
          <p className="text-sm text-gray-500">Top predictors this month</p>
        </div>
        <div className="glass flex items-center gap-3 px-4 py-2">
          <span className="text-xs uppercase text-gray-500">Resets in</span>
          <Countdown to={nextMonthReset()} compact />
        </div>
      </div>

      {/* Podium */}
      <div className="mt-8 flex items-end justify-center gap-4">
        {[top3[1], top3[0], top3[2]].map((entry, i) => {
          const rank = (i === 1 ? 1 : i === 0 ? 2 : 3) as 1 | 2 | 3;
          return <Podium key={entry?.user_id ?? rank} entry={entry} rank={rank} />;
        })}
      </div>

      {/* Table */}
      <div className="mt-10 glass-gold overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark-800/80 text-xs uppercase tracking-widest text-gray-500">
            <tr>
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Player</th>
              <th className="px-5 py-3 text-right">Bets</th>
              <th className="px-5 py-3 text-right">Win %</th>
              <th className="px-5 py-3 text-right">Profit</th>
              <th className="px-5 py-3 text-right">Copy</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((e) => (
              <tr key={e.user_id} className="border-t border-white/5 transition hover:bg-white/5">
                <td className="px-5 py-3 font-mono text-gold">#{e.rank}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-dark-600 font-heading text-gold">
                      {e.username[0]?.toUpperCase()}
                    </span>
                    {e.username}
                    {e.achievements && e.achievements.length > 0 && (
                      <AchievementBadges achievements={e.achievements} size="sm" />
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-gray-400">{e.bets}</td>
                <td className="px-5 py-3 text-right text-gray-400">{e.win_rate}%</td>
                <td className={`px-5 py-3 text-right font-semibold ${e.profit >= 0 ? "text-win" : "text-lose"}`}>
                  {e.profit >= 0 ? "+" : ""}₹{e.profit.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3 text-right">
                  {user?.id === e.user_id ? (
                    <span className="text-xs text-gray-600">You</span>
                  ) : (
                    <button
                      onClick={() => toggleCopy(e.user_id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        copying.has(e.user_id)
                          ? "border-win/50 bg-win/10 text-win"
                          : "border-gold/40 text-gold hover:bg-gold/10"
                      }`}
                    >
                      {copying.has(e.user_id) ? "✓ Copying" : "Copy"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                  No bets yet this month — be the first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageTransition>
  );
}

function Podium({ entry, rank }: { entry?: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  const meta = {
    1: { h: "h-40", crown: "👑", ring: "border-gold shadow-gold-lg", label: "GOLD" },
    2: { h: "h-32", crown: "🥈", ring: "border-gray-400", label: "SILVER" },
    3: { h: "h-28", crown: "🥉", ring: "border-amber-700", label: "BRONZE" },
  }[rank];
  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl animate-float">{meta.crown}</div>
      <div className={`mt-1 grid h-16 w-16 place-items-center rounded-full border-2 ${meta.ring} bg-dark-700 font-heading text-2xl text-gold`}>
        {entry ? entry.username[0]?.toUpperCase() : "—"}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-200">{entry?.username ?? "—"}</div>
      <div className="text-xs text-win">
        {entry ? `+₹${entry.profit.toLocaleString("en-IN")}` : ""}
      </div>
      <div className={`mt-2 flex w-28 items-start justify-center rounded-t-lg border-t-2 ${meta.ring} bg-dark-700/60 ${meta.h} pt-2 font-heading text-xs tracking-widest text-gray-500`}>
        {meta.label}
      </div>
    </div>
  );
}
