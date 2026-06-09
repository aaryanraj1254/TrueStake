import type { Withdrawal, WithdrawalStatus } from "@truestake/shared";
import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { usePoll } from "@/hooks/usePoll";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";

const STATUS_STYLE: Record<WithdrawalStatus, string> = {
  pending: "border-gold/40 text-gold",
  approved: "border-win/40 text-win",
  rejected: "border-lose/40 text-lose",
};

export default function AdminWithdrawals() {
  const { data: wallet, loading: walletLoading } = usePoll<{ is_admin: boolean }>("/api/wallet", 60_000);
  const { data, refetch, error } = usePoll<Withdrawal[]>("/api/admin/withdrawals", 20_000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  // Gate the page behind the admin flag.
  if (!walletLoading && wallet && !wallet.is_admin) {
    return (
      <PageTransition>
        <div className="glass mt-10 p-10 text-center text-gray-400">
          <h1 className="font-heading text-3xl text-lose">403 — ADMINS ONLY</h1>
          <p className="mt-2 text-sm">You don't have permission to view withdrawal management.</p>
        </div>
      </PageTransition>
    );
  }

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const note = action === "reject" ? prompt("Reason for rejection (optional):") ?? undefined : undefined;
      await api.post(`/api/admin/withdrawals/${id}/${action}`, action === "reject" ? { note } : {});
      toast(`Withdrawal ${action === "approve" ? "approved" : "rejected"}`, "success");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  const rows = data ?? [];

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">WITHDRAWAL MANAGEMENT</h1>
      <p className="mb-6 text-sm text-gray-500">Review and process payout requests</p>

      {error && <p className="mb-4 text-sm text-lose">{error}</p>}

      <div className="glass-gold overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark-800/80 text-xs uppercase tracking-widest text-gray-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Method</th>
              <th className="px-5 py-3">Requested</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-white/5">
                <td className="px-5 py-3">
                  <div className="font-semibold text-gray-200">{w.users?.username ?? "—"}</div>
                  <div className="text-xs text-gray-500">{w.users?.email}</div>
                </td>
                <td className="px-5 py-3 text-right font-mono text-gold">
                  ₹{Number(w.amount).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3 text-xs">
                  <div className="text-gray-300">{w.method === "metamask" ? "🦊 MetaMask" : "🏦 Bank"}</div>
                  {w.destination && <div className="font-mono text-[10px] text-gray-600">{w.destination}</div>}
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  {new Date(w.requested_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-5 py-3">
                  <span className={`pill ${STATUS_STYLE[w.status]}`}>{w.status.toUpperCase()}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  {w.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => act(w.id, "approve")}
                        disabled={busyId === w.id}
                        className="rounded-lg border border-win/40 bg-win/10 px-3 py-1.5 text-xs font-semibold text-win transition hover:bg-win/20 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => act(w.id, "reject")}
                        disabled={busyId === w.id}
                        className="rounded-lg border border-lose/40 bg-lose/10 px-3 py-1.5 text-xs font-semibold text-lose transition hover:bg-lose/20 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                  No withdrawal requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageTransition>
  );
}
