"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Email delivery seam for VEX / MERCURY outreach.
 *
 * - LIVE mode (RESEND_API_KEY set): sends via the Resend API.
 * - DEMO mode (no key): returns `simulated: true` — the engine records the
 *   outreach event in the database exactly as if it had been sent, so the
 *   whole loop is observable without credentials.
 */
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    fromAddress: v.optional(v.string()),
    fromName: v.optional(v.string()),
    forceLive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const live = !!apiKey && !!args.forceLive;

    if (!live) {
      return {
        simulated: true,
        messageId: `demo_${Date.now()}`,
      };
    }

    try {
      const from = `${args.fromName ?? "B2K Agency"} <${args.fromAddress ?? "outreach@b2kagency.app"}>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [args.to],
          subject: args.subject,
          html: args.html,
        }),
      });

      if (!res.ok) {
        throw new Error(`Resend error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as { id: string };
      return { simulated: false, messageId: data.id };
    } catch (err) {
      console.error("[sendEmail] failed:", err);
      throw new Error(err instanceof Error ? err.message : "email send failed");
    }
  },
});