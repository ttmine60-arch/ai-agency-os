"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Text-generation seam for the agency engine.
 *
 * - LIVE mode (OPENAI_API_KEY set): calls the OpenAI chat completions API.
 * - DEMO mode (no key): returns a simple fallback so the pipeline never
 *   blocks on missing credentials.
 *
 * The demo engine mostly uses deterministic templates in lib/demo.ts; this
 * action is the seam where real personalization plugs in once the owner adds
 * an OPENAI_API_KEY.
 */
export const generateText = action({
  args: {
    system: v.string(),
    prompt: v.string(),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        text: "",
        model: "demo-fallback",
        simulated: true,
      };
    }

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: args.temperature ?? 0.7,
          max_tokens: args.maxTokens ?? 500,
          messages: [
            { role: "system", content: args.system },
            { role: "user", content: args.prompt },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      return {
        text: data.choices[0]?.message?.content ?? "",
        model: "gpt-4o-mini",
        simulated: false,
      };
    } catch (err) {
      console.error("[generateText] failed:", err);
      return {
        text: "",
        model: "error",
        simulated: true,
        error: err instanceof Error ? err.message : "unknown error",
      };
    }
  },
});