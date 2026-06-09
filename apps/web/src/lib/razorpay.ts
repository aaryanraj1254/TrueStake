import { api } from "./api";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme?: { color?: string };
  handler: (resp: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
  prefill?: { email?: string; name?: string };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Lazily inject the Razorpay checkout script once.
function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface DepositResult {
  status: "success" | "dismissed" | "error";
  balance?: number;
  message?: string;
}

/**
 * Full deposit flow: create order on our API → open Razorpay checkout →
 * verify the signature on our API → wallet credited. Resolves with the result.
 */
export async function depositMoney(amount: number, prefill?: { email?: string; name?: string }): Promise<DepositResult> {
  const ok = await loadScript();
  if (!ok || !window.Razorpay) return { status: "error", message: "Failed to load Razorpay" };

  let order: { orderId: string; amount: number; currency: string; keyId: string };
  try {
    order = await api.post("/api/payments/order", { amount });
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not start payment" };
  }

  // Prefer the key the backend returned (always in sync with the secret);
  // fall back to the build-time env var if the API omits it.
  const keyId = order.keyId || (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) || "";

  return new Promise<DepositResult>((resolve) => {
    const rzp = new window.Razorpay!({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "TrueStake",
      description: `Add ₹${amount.toLocaleString("en-IN")} to wallet`,
      order_id: order.orderId,
      theme: { color: "#F0B429" },
      prefill,
      modal: { ondismiss: () => resolve({ status: "dismissed" }) },
      handler: async (resp) => {
        try {
          const verified = await api.post<{ balance: number }>("/api/payments/verify", {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            amount,
          });
          resolve({ status: "success", balance: verified.balance });
        } catch (e) {
          resolve({ status: "error", message: e instanceof Error ? e.message : "Verification failed" });
        }
      },
    });
    rzp.open();
  });
}
