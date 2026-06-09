import type { AchievementsResponse } from "@truestake/shared";
import { useCallback, useEffect, useState } from "react";
import { AchievementBadges } from "@/components/AchievementBadges";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { usePoll } from "@/hooks/usePoll";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";

interface EnrollData {
  factorId: string;
  qr: string;
  secret: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasMfa, setHasMfa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setHasMfa((data?.totp ?? []).some((f) => f.status === "verified"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startEnroll() {
    setBusy(true);
    try {
      // Clean up any unverified factor first so re-enrolling never collides.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.totp ?? []) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `TrueStake-${Date.now()}` });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not start 2FA setup", "error");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll() {
    if (!enroll) return;
    setBusy(true);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: ch.id,
        code,
      });
      if (vErr) throw vErr;
      toast("2FA enabled 🔐", "success");
      setEnroll(null);
      setCode("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Invalid code", "error");
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa() {
    setBusy(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
      toast("2FA disabled", "info");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const { data: ach } = usePoll<AchievementsResponse>("/api/achievements", 30_000);

  return (
    <PageTransition>
      <h1 className="font-heading text-4xl tracking-wide text-gray-100">PROFILE</h1>
      <p className="mb-6 text-sm text-gray-500">Account & security</p>

      <div className="glass-gold mb-6 flex items-center gap-4 p-6">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gold-gradient font-heading text-3xl text-dark-900">
          {(user?.user_metadata?.username ?? user?.email ?? "?")[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-2xl text-gray-100">
              {user?.user_metadata?.username ?? user?.email?.split("@")[0]}
            </span>
            {hasMfa && (
              <span className="pill border-win/40 text-win">🔐 2FA Enabled</span>
            )}
          </div>
          <div className="text-sm text-gray-500">{user?.email}</div>
        </div>
      </div>

      {/* Streak + achievements */}
      <div className="glass mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl tracking-wide text-gray-100">ACHIEVEMENTS</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">
              🔥 Streak: <span className="font-semibold text-gold">{ach?.current_streak ?? 0}</span>
            </span>
            <span className="text-gray-400">
              Best: <span className="font-semibold text-gold">{ach?.best_streak ?? 0}</span>
            </span>
          </div>
        </div>
        <AchievementBadges achievements={ach?.achievements ?? []} />
      </div>

      <div className="glass p-6">
        <h2 className="mb-1 font-heading text-xl tracking-wide text-gray-100">TWO-FACTOR AUTHENTICATION</h2>
        <p className="mb-4 text-sm text-gray-500">
          Protect your account with a TOTP app like Google Authenticator. Required on every login once enabled.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : hasMfa ? (
          <div className="flex items-center justify-between rounded-lg border border-win/30 bg-win/5 p-4">
            <span className="text-sm text-win">✓ Two-factor authentication is active on your account.</span>
            <button onClick={disableMfa} disabled={busy} className="btn-ghost text-xs">
              Disable
            </button>
          </div>
        ) : enroll ? (
          <div className="rounded-lg border border-gold/30 bg-dark-800/60 p-5">
            <p className="mb-3 text-sm text-gray-300">1. Scan this QR with Google Authenticator:</p>
            <img src={enroll.qr} alt="2FA QR code" className="mx-auto mb-3 h-44 w-44 rounded-lg bg-white p-2" />
            <p className="mb-3 break-all text-center text-[11px] text-gray-500">
              Or enter the key manually: <span className="font-mono text-gray-400">{enroll.secret}</span>
            </p>
            <p className="mb-2 text-sm text-gray-300">2. Enter the 6-digit code:</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="input-dark mb-3 text-center font-mono text-2xl tracking-[0.4em]"
            />
            <div className="flex gap-2">
              <button onClick={verifyEnroll} disabled={busy || code.length !== 6} className="btn-gold flex-1">
                {busy ? "Verifying…" : "Verify & Enable"}
              </button>
              <button onClick={() => setEnroll(null)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={startEnroll} disabled={busy} className="btn-gold">
            {busy ? "Setting up…" : "Enable 2FA"}
          </button>
        )}
      </div>
    </PageTransition>
  );
}
