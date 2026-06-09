import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBGM } from "@/hooks/useBGM";
import { useTheme } from "@/hooks/useTheme";
import { AddMoneyModal } from "./AddMoneyModal";
import { ConnectWallet } from "./ConnectWallet";

export function Header() {
  const { theme, toggle } = useTheme();
  const { playing, toggle: toggleBgm } = useBGM();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-dark-900/70 px-4 py-3 backdrop-blur-xl md:px-8">
      <div className="font-heading text-xl tracking-widest text-gold-gradient md:hidden">TRUESTAKE</div>
      <Link to="/profile" className="hidden text-sm text-gray-400 transition hover:text-gold md:block">
        Welcome back, <span className="text-gold">{user?.user_metadata?.username ?? user?.email?.split("@")[0]}</span>
      </Link>

      <div className="flex items-center gap-2 md:gap-3">
        <button onClick={() => setAddMoneyOpen(true)} className="btn-gold text-xs">
          + Add<span className="hidden sm:inline"> Money</span>
        </button>
        <AddMoneyModal open={addMoneyOpen} onClose={() => setAddMoneyOpen(false)} />

        {/* Wallet connect hidden on the smallest screens — reachable via Wallet page */}
        <div className="hidden sm:block">
          <ConnectWallet />
        </div>

        <IconButton title="Notifications" onClick={() => {}}>
          <span className="relative">
            🔔
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-lose animate-pulse-dot" />
          </span>
        </IconButton>

        <span className="hidden sm:contents">
          <IconButton title="Toggle music" onClick={toggleBgm}>
            {playing ? "🔊" : "🔈"}
          </IconButton>
        </span>

        <IconButton title="Toggle theme" onClick={toggle}>
          {theme === "dark" ? "🌙" : "☀️"}
        </IconButton>

        <button
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="btn-ghost text-xs"
        >
          <span className="hidden sm:inline">Sign out</span>
          <span className="sm:hidden">⏻</span>
        </button>
      </div>
    </header>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 transition hover:border-gold/40"
    >
      {children}
    </button>
  );
}
