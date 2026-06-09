interface RiskCalculatorProps {
  amount: number;
  odds: number; // decimal odds, e.g. 2.0 = even money
  bankroll: number;
}

// Shows potential profit/loss and a Kelly Criterion suggested stake.
export function RiskCalculator({ amount, odds, bankroll }: RiskCalculatorProps) {
  const potentialProfit = amount * (odds - 1);
  const potentialLoss = amount;

  // Kelly: f* = (bp - q) / b, where b = odds-1, p = win prob, q = 1-p.
  // We infer implied probability from odds and add a small edge assumption.
  const impliedP = 1 / odds;
  const p = Math.min(impliedP + 0.05, 0.95);
  const b = odds - 1;
  const q = 1 - p;
  const kellyFraction = b > 0 ? Math.max(0, (b * p - q) / b) : 0;
  const kellyStake = Math.round(bankroll * kellyFraction);

  return (
    <div className="rounded-xl border border-white/10 bg-dark-800/80 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Risk Calculator</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Row label="Potential profit" value={`+₹${potentialProfit.toFixed(2)}`} className="text-win" />
        <Row label="Potential loss" value={`-₹${potentialLoss.toFixed(2)}`} className="text-lose" />
        <Row label="Decimal odds" value={`${odds.toFixed(2)}×`} />
        <Row label="Implied win %" value={`${(impliedP * 100).toFixed(0)}%`} />
      </div>
      <div className="mt-3 rounded-lg border border-gold/20 bg-gold/5 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Kelly suggested stake</span>
          <span className="font-semibold text-gold">₹{kellyStake.toLocaleString("en-IN")}</span>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          {(kellyFraction * 100).toFixed(1)}% of your ₹{bankroll.toLocaleString("en-IN")} bankroll
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase text-gray-500">{label}</span>
      <span className={`font-semibold ${className}`}>{value}</span>
    </div>
  );
}
