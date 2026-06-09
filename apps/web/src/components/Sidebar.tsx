import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { usePoll } from "@/hooks/usePoll";
import { Logo } from "./Logo";
import { ADMIN_ITEM, NAV } from "./navConfig";

export function Sidebar() {
  const { data } = usePoll<{ is_admin: boolean }>("/api/wallet", 60_000);
  const nav = data?.is_admin ? [...NAV, ADMIN_ITEM] : NAV;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-black/80 px-4 py-6 backdrop-blur-xl md:flex">
      <div className="px-2">
        <Logo to="/dashboard" />
      </div>

      <nav className="mt-10 flex flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-4 py-3 font-body font-semibold transition ${
                isActive ? "text-gold" : "text-gray-400 hover:text-gray-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-gold/40 bg-gold/5 animate-breathe"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10 text-lg">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 text-xs text-gray-600">v0.1.0 · Predict. Bet. Win.</div>
    </aside>
  );
}
