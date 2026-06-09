import { api } from "./api";

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Register the service worker, ask for notification permission, subscribe to
 * push, and persist the subscription on the backend. Returns true on success.
 */
export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  if (!pushSupported()) return { ok: false, message: "Push not supported in this browser" };

  const { publicKey, enabled } = await api.get<{ publicKey: string; enabled: boolean }>("/api/alerts/vapid");
  if (!enabled || !publicKey) return { ok: false, message: "Push not configured on the server" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, message: "Notification permission denied" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await api.post("/api/alerts/subscribe", sub.toJSON());
  return { ok: true };
}
