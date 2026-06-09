import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ParticlesBg } from "@/components/ParticlesBg";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // If the account has 2FA, Supabase leaves the session at aal1 until the
    // TOTP code is verified — show the OTP step instead of going to dashboard.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setBusy(false);
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      setMfaStep(true);
      return;
    }
    navigate("/dashboard");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
      if (!factor) throw new Error("No 2FA factor found");
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code });
      if (vErr) throw vErr;
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-dark-900 px-4">
      <ParticlesBg />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-gold relative z-10 w-full max-w-md p-8"
      >
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {mfaStep ? (
          <>
            <h1 className="text-center font-heading text-3xl tracking-wide text-gray-100">TWO-FACTOR</h1>
            <p className="mb-6 text-center text-sm text-gray-500">
              Enter the 6-digit code from your authenticator app
            </p>
            <form onSubmit={verifyOtp} className="flex flex-col gap-4">
              <input
                autoFocus
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="input-dark text-center font-mono text-2xl tracking-[0.4em]"
              />
              {error && <p className="text-sm text-lose">{error}</p>}
              <button type="submit" disabled={busy || code.length !== 6} className="btn-gold">
                {busy ? "Verifying…" : "Verify"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-center font-heading text-3xl tracking-wide text-gray-100">WELCOME BACK</h1>
            <p className="mb-6 text-center text-sm text-gray-500">Sign in to your arena</p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark"
              />
              {error && <p className="text-sm text-lose">{error}</p>}
              <button type="submit" disabled={busy} className="btn-gold">
                {busy ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              No account?{" "}
              <Link to="/register" className="text-gold hover:underline">
                Create one
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
