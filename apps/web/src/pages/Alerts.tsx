import type { PriceAlert } from "@truestake/shared";
import { PageTransition } from "@/components/PageTransition";
import { usePoll } from "@/hooks/usePoll";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { enablePush, pushSupported } from "@/lib/push";

export default function Alerts() {
  const { data, refetch } = usePoll<PriceAlert[]>("/api/alerts", 30_000);
  const { toast } = useToast();
  const alerts = data ?? [];

  async function remove(id: string) {
    try {
      await api.del(`/api/alerts/${id}`);
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    }
  }

  async function turnOnPush() {
    const r = await enablePush();
    toast(r.ok ? "Browser notifications enabled" : r.message ?? "Could not enable", r.ok ? "success" : "error");
  }

  return (
    <PageTransition>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-wide text-gray-100">PRICE ALERTS</h1>
          <p className="mb-6 text-sm text-gray-500">Get notified when crypto/stock prices hit your targets</p>
        </div>
        {pushSupported() && (
          <button onClick={turnOnPush} className="btn-ghost text-sm">
            🔔 Enable notifications
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="glass mt-6 p-10 text-center text-gray-500">
          No alerts yet. Tap the 🔔 on any crypto or stock market to set one.
        </div>
      ) : (
        <div className="glass-gold mt-2 divide-y divide-white/5">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-heading text-lg text-gray-100">{a.title}</div>
                <div className="text-sm text-gray-400">
                  {a.direction === "above" ? "▲ rises above" : "▼ falls below"}{" "}
                  <span className="text-gold">₹{Number(a.target_price).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`pill ${a.status === "triggered" ? "border-win/40 text-win" : "border-gold/40 text-gold"}`}
                >
                  {a.status.toUpperCase()}
                </span>
                <button onClick={() => remove(a.id)} className="text-gray-500 hover:text-lose" title="Delete">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
