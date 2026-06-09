import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

type EmailEvent = "bet_placed" | "bet_won" | "bet_lost" | "price_alert";

const templates: Record<EmailEvent, (ctx: EmailContext) => { subject: string; html: string }> = {
  bet_placed: (c) => ({
    subject: `🎯 Bet placed on ${c.marketTitle}`,
    html: wrap(`Your <b>₹${c.amount}</b> ${c.direction?.toUpperCase()} bet on <b>${c.marketTitle}</b> is live. Good luck.`),
  }),
  price_alert: (c) => ({
    subject: `🔔 ${c.marketTitle} price alert triggered`,
    html: wrap(c.alertBody ?? `Your price alert on <b>${c.marketTitle}</b> has triggered.`),
  }),
  bet_won: (c) => ({
    subject: `🏆 You won ₹${c.payout} on ${c.marketTitle}`,
    html: wrap(
      `Congratulations! Your prediction landed. <b>₹${c.payout}</b> + <b>${c.supercoins} SuperCoins</b> credited to your wallet.`,
    ),
  }),
  bet_lost: (c) => ({
    subject: `📉 Your bet on ${c.marketTitle} didn't land`,
    html: wrap(`Tough luck — your ₹${c.amount} ${c.direction?.toUpperCase()} bet on <b>${c.marketTitle}</b> lost. Next one's yours.`),
  }),
};

interface EmailContext {
  marketTitle: string;
  amount?: number;
  payout?: number;
  supercoins?: number;
  direction?: string;
  alertBody?: string;
}

function wrap(body: string): string {
  return `
  <div style="background:#050508;color:#e8e8ee;font-family:Rajdhani,Arial,sans-serif;padding:32px;border-radius:12px">
    <h1 style="color:#F0B429;font-family:'Bebas Neue',Arial;letter-spacing:2px;margin:0 0 16px">TRUESTAKE</h1>
    <p style="font-size:16px;line-height:1.6">${body}</p>
    <hr style="border:none;border-top:1px solid #1a1a24;margin:24px 0" />
    <p style="font-size:12px;color:#6b6b78">Predict. Bet. Win.</p>
  </div>`;
}

export async function sendEmail(to: string, event: EmailEvent, ctx: EmailContext): Promise<void> {
  if (!resend) {
    console.log(`[email] (no RESEND_API_KEY) would send "${event}" to ${to}`);
    return;
  }
  const { subject, html } = templates[event](ctx);
  try {
    await resend.emails.send({ from: env.resendFrom, to, subject, html });
  } catch (err) {
    console.error("[email] send failed", err);
  }
}
