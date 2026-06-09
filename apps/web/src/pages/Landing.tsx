import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ParticlesBg } from "@/components/ParticlesBg";
import { Ticker } from "@/components/Ticker";
import { useCountUp } from "@/hooks/useCountUp";

export default function Landing() {
  useEffect(() => {
    console.log("[Landing] mounted — / route rendered");
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-dark-900">
      <ParticlesBg />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">
            Login
          </Link>
          <Link to="/register" className="btn-gold text-sm">
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-16 text-center md:pt-24">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pill border-gold/30 text-gold"
        >
          ⚡ Live prediction markets · 24/7
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 font-heading text-6xl leading-none tracking-wide text-gold-gradient md:text-8xl"
        >
          PREDICT. BET. WIN.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-6 max-w-xl text-lg text-gray-400"
        >
          Trade your conviction on crypto, stocks, IPL, forex and viral tweets. The most hardcore dark
          prediction arena ever built.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex gap-4"
        >
          <Link to="/register" className="btn-gold text-base">
            Start Predicting →
          </Link>
          <Link to="/login" className="btn-ghost text-base">
            I have an account
          </Link>
        </motion.div>
      </section>

      {/* Ticker */}
      <div className="relative z-10 mt-16">
        <Ticker />
      </div>

      {/* Stats */}
      <section className="relative z-10 mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 px-6 md:grid-cols-3">
        <Counter label="Total Bets" value={1_284_500} />
        <Counter label="Active Users" value={87_400} />
        <Counter label="Volume (₹)" value={92_300_000} prefix="₹" />
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto mt-24 max-w-5xl px-6">
        <h2 className="text-center font-heading text-4xl tracking-wide text-gray-100">HOW IT WORKS</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-gold shimmer p-6"
            >
              <div className="font-heading text-5xl text-gold/30">0{i + 1}</div>
              <h3 className="mt-3 font-heading text-2xl tracking-wide text-gold">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="relative z-10 mx-auto mt-24 max-w-3xl px-6">
        <h2 className="text-center font-heading text-4xl tracking-wide text-gray-100">TOP PREDICTORS</h2>
        <div className="mt-10 flex items-end justify-center gap-4">
          <Podium rank={2} name="NeoTrader" profit={184200} />
          <Podium rank={1} name="GoldHand" profit={421900} />
          <Podium rank={3} name="AlphaWolf" profit={142500} />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-24 border-t border-white/5 px-6 py-10 md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
          <Logo />
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gold">Markets</a>
            <a href="#" className="hover:text-gold">Leaderboard</a>
            <a href="#" className="hover:text-gold">Docs</a>
            <a href="#" className="hover:text-gold">Terms</a>
          </div>
          <span className="text-xs text-gray-600">© {new Date().getFullYear()} TrueStake</span>
        </div>
      </footer>
    </div>
  );
}

function Counter({ label, value, prefix = "" }: { label: string; value: number; prefix?: string }) {
  const display = useCountUp(value);
  return (
    <div className="glass p-6 text-center">
      <div className="font-heading text-4xl text-gold-gradient">
        {prefix}
        {display}
      </div>
      <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">{label}</div>
    </div>
  );
}

function Podium({ rank, name, profit }: { rank: 1 | 2 | 3; name: string; profit: number }) {
  const meta = {
    1: { h: "h-40", crown: "👑", ring: "border-gold shadow-gold-lg", label: "GOLD" },
    2: { h: "h-32", crown: "🥈", ring: "border-gray-400", label: "SILVER" },
    3: { h: "h-28", crown: "🥉", ring: "border-amber-700", label: "BRONZE" },
  }[rank];
  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl">{meta.crown}</div>
      <div className={`mt-1 grid h-14 w-14 place-items-center rounded-full border-2 ${meta.ring} bg-dark-700 font-heading text-xl text-gold`}>
        {name[0]}
      </div>
      <div className="mt-2 text-sm font-semibold text-gray-200">{name}</div>
      <div className="text-xs text-win">+₹{profit.toLocaleString("en-IN")}</div>
      <div className={`mt-2 flex w-24 items-start justify-center rounded-t-lg border-t-2 ${meta.ring} bg-dark-700/60 ${meta.h} pt-2 font-heading text-xs tracking-widest text-gray-500`}>
        {meta.label}
      </div>
    </div>
  );
}

const STEPS = [
  { title: "PICK A MARKET", body: "Crypto, stocks, IPL, forex or viral tweets — hundreds of live markets refreshing every 30 seconds." },
  { title: "STAKE YOUR CALL", body: "Bet UP or DOWN with our built-in risk calculator and Kelly Criterion sizing." },
  { title: "WIN & REDEEM", body: "Cash out winnings, earn SuperCoins, and redeem them for real vouchers." },
];
