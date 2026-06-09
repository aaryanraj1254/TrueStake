import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const aiRouter: Router = Router();

const anthropic = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

const predictSchema = z.object({
  marketId: z.string().min(1),
  marketType: z.enum(["crypto", "stock", "ipl", "forex", "tweet"]),
  symbol: z.string().min(1),
  title: z.string().min(1),
  price: z.number().optional(),
  change: z.number().optional(),
});

interface AiResult {
  prediction: "up" | "down" | "neutral";
  confidence: number;
  reasoning: string;
}

function parseResult(text: string): AiResult {
  // Claude returns a JSON object; pull it out defensively.
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? JSON.parse(match[0]) : {};
  const prediction = ["up", "down", "neutral"].includes(raw.prediction) ? raw.prediction : "neutral";
  const confidence = Math.max(0, Math.min(100, Number(raw.confidence) || 50));
  const reasoning = String(raw.reasoning ?? "No reasoning provided.").slice(0, 600);
  return { prediction, confidence, reasoning };
}

// POST /api/ai/predict — ask Claude Haiku for a short prediction analysis.
aiRouter.post(
  "/predict",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!anthropic) throw new HttpError(503, "AI not configured — add ANTHROPIC_API_KEY.");
    const b = predictSchema.parse(req.body);

    const priceLine = b.price !== undefined ? `Current price: ₹${b.price.toLocaleString("en-IN")}.` : "";
    const changeLine = b.change !== undefined ? `24h change: ${b.change.toFixed(2)}%.` : "";

    let message;
    try {
      message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 400,
        system:
          "You are a market analyst for a prediction-market platform. Given a market and its recent price data, give a SHORT directional call. " +
          "Respond with ONLY a JSON object (no prose, no markdown) of the form " +
          '{"prediction":"up"|"down"|"neutral","confidence":<0-100 integer>,"reasoning":"<=2 sentence rationale"}. ' +
          "This is informational only, never financial advice.",
        messages: [
          {
            role: "user",
            content: `Market: ${b.title} (${b.marketType}, symbol ${b.symbol}). ${priceLine} ${changeLine} Will it move UP or DOWN over the next hour? Give your JSON.`,
          },
        ],
      });
    } catch (err) {
      // Surface Anthropic's own message (e.g. low credit balance) to the client.
      if (err instanceof Anthropic.APIError) {
        const msg = (err.error as { error?: { message?: string } })?.error?.message ?? err.message;
        throw new HttpError(err.status === 400 ? 402 : 502, `AI unavailable: ${msg}`);
      }
      throw err;
    }

    const text = message.content.find((c) => c.type === "text")?.text ?? "{}";
    const result = parseResult(text);

    const { data: saved } = await supabase
      .from("ai_predictions")
      .insert({
        market_id: b.marketId,
        symbol: b.symbol,
        title: b.title,
        prediction: result.prediction,
        confidence: result.confidence,
        reasoning: result.reasoning,
        price: b.price ?? null,
      })
      .select("*")
      .single();

    res.json(saved ?? { ...result, market_id: b.marketId });
  }),
);
