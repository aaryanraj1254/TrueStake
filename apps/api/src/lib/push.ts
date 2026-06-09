import webpush from "web-push";
import { env } from "../config/env.js";
import { supabase } from "../config/supabase.js";

const enabled = !!env.vapidPublicKey && !!env.vapidPrivateKey;
if (enabled) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Send a web-push notification to every subscription a user has registered. */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!enabled) {
    console.log(`[push] (no VAPID keys) would push "${payload.title}" to ${userId}`);
    return;
  }
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
    } catch (err) {
      // 404/410 → subscription expired; prune it.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("[push] send failed", status);
      }
    }
  }
}
