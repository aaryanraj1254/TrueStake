export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

// Full navigation (also used by the desktop sidebar).
export const NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: "◆" },
  { to: "/markets", label: "Markets", icon: "↯" },
  { to: "/sports", label: "Sports", icon: "✦" },
  { to: "/trending", label: "Trending", icon: "🔥" },
  { to: "/bets", label: "My Bets", icon: "▤" },
  { to: "/portfolio", label: "Portfolio", icon: "▦" },
  { to: "/leaderboard", label: "Leaderboard", icon: "♛" },
  { to: "/wallet", label: "Wallet", icon: "▣" },
  { to: "/alerts", label: "Alerts", icon: "🔔" },
  { to: "/redeem", label: "Redeem", icon: "◉" },
  { to: "/watchlist", label: "Watchlist", icon: "★" },
];

export const ADMIN_ITEM: NavItem = { to: "/admin/withdrawals", label: "Admin", icon: "⚙" };

// The handful shown in the mobile bottom tab bar.
export const MOBILE_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: "◆" },
  { to: "/markets", label: "Markets", icon: "↯" },
  { to: "/sports", label: "Sports", icon: "✦" },
  { to: "/bets", label: "Bets", icon: "▤" },
];
