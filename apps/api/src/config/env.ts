import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    // In dev we warn rather than crash so the app can boot with partial config.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env var: ${name}`);
    }
    console.warn(`[env] missing ${name} — using empty string (dev only)`);
    return "";
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 3000),

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_KEY"),
  jwtSecret: required("JWT_SECRET", "dev-insecure-secret"),

  cricapiKey: process.env.CRICAPI_KEY ?? "",
  alphaVantageKey: process.env.ALPHAVANTAGE_KEY ?? "",
  twitterBearerToken: process.env.TWITTER_BEARER_TOKEN ?? "",

  sentryDsn: process.env.SENTRY_DSN ?? "",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "TrueStake <no-reply@truestake.app>",

  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",

  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:no-reply@truestake.app",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  redditClientId: process.env.REDDIT_CLIENT_ID ?? "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
  redditUserAgent: process.env.REDDIT_USER_AGENT ?? "truestake/1.0 (by /u/truestake)",
  newsApiKey: process.env.NEWSAPI_KEY ?? "",

  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
} as const;
