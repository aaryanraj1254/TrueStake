import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { usePoll } from "@/hooks/usePoll";
import { Logo } from "./Logo";
import { ADMIN_ITEM, MOBILE_PRIMARY, NAV } from "./navConfig";

// Bottom tab bar + slide-in drawer. Visible only below the md breakpoint.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data } = usePoll<{ is_admin: boolean }>("/api/wallet", 60_000);
  const location = useLocation();
  const nav = data?.is_admin ? [...NAV, ADMIN_ITEM] : NAV;

  return (
    <div className="md:hidden">
      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-black/90 px-2 py-1.5 backdrop-blur-xl">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold transition ${
                isActive ? "text-gold" : "text-gray-500"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold text-gray-500"
        >
          <span className="text-lg">≡</span>
          More
        </button>
      </nav>

      {/* Full drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-white/10 bg-black px-4 py-6"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
            >
              <div className="mb-8 flex items-center justify-between px-2">
                <Logo to="/dashboard" />
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-200">
                  ✕
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {nav.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 font-body font-semibold transition ${
                        active ? "border border-gold/40 bg-gold/5 text-gold" : "text-gray-400 hover:text-gray-100"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
