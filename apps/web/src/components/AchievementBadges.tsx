import type { Achievement } from "@truestake/shared";

const ICON: Record<string, string> = {
  first_bet: "🎯",
  streak_5: "🔥",
  bets_100: "💯",
  big_winner: "💰",
};

// Renders earned achievement badges. `size` controls compact (leaderboard) vs full (profile).
export function AchievementBadges({ achievements, size = "full" }: { achievements: Achievement[]; size?: "full" | "sm" }) {
  if (size === "sm") {
    return (
      <div className="flex gap-1">
        {achievements.map((a) => (
          <span key={a.code} title={a.title} className="text-sm">
            {ICON[a.code] ?? "🏅"}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {achievements.length === 0 && <p className="text-sm text-gray-500">No achievements yet — place a bet to start.</p>}
      {achievements.map((a) => (
        <div
          key={a.code}
          className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-2 shadow-gold"
        >
          <span className="text-2xl">{ICON[a.code] ?? "🏅"}</span>
          <span className="font-heading text-sm tracking-wide text-gold">{a.title}</span>
        </div>
      ))}
    </div>
  );
}
