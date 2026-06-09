import { motion } from "framer-motion";
import { customAlphabet } from "nanoid";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ParticlesBg } from "@/components/ParticlesBg";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const genReferral = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(params.get("ref") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const referral_code = genReferral();
    // The DB trigger (handle_new_auth_user) reads this metadata to create the
    // public.users profile + wallet — RLS blocks a client-side insert by design.
    const { data, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, referral_code } },
    });
    if (authErr) {
      setError(authErr.message);
      setBusy(false);
      return;
    }

    // If email confirmation is enabled, signUp returns no session — tell the
    // user to confirm rather than bouncing them to a protected route.
    if (!data.session) {
      setBusy(false);
      setError("Account created! Check your email to confirm, then sign in.");
      return;
    }

    // Apply referral if provided — credits both users 200 SuperCoins.
    if (referral.trim()) {
      try {
        await api.post("/api/referral/apply", { code: referral.trim() });
      } catch {
        /* invalid code — ignore, registration still succeeds */
      }
    }

    setBusy(false);
    navigate("/dashboard");
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-dark-900 px-4 py-10">
      <ParticlesBg />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-gold relative z-10 w-full max-w-md p-8"
      >
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center font-heading text-3xl tracking-wide text-gray-100">JOIN THE ARENA</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Create your account in seconds</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            required
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-dark"
          />
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
            minLength={6}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-dark"
          />
          <input
            placeholder="Referral code (optional)"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            className="input-dark"
          />
          {referral && <p className="-mt-2 text-xs text-gold">🎁 You & your referrer get 200 SuperCoins!</p>}
          {error && <p className="text-sm text-lose">{error}</p>}
          <button type="submit" disabled={busy} className="btn-gold">
            {busy ? "Creating…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
