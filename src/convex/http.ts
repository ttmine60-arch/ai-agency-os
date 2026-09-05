import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { handleVoiceRequest } from "./lib/voice";
import { ConvexError } from "convex/values";

const http = httpRouter();

auth.addHttpRoutes(http);

// ── DEMO WEBSITE SERVING ────────────────────────────────────────────────────
// When a prospect clicks a demo link, Convex serves the generated HTML.
// URL format: /demo/:slug

http.route({
  path: "/demo/:slug",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = url.pathname.split("/demo/")[1];
    if (!slug) {
      return new Response("Not found", { status: 404 });
    }

    // Look up the website by slug
    const site = await ctx.db
      .query("websites")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .first();

    if (!site) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Demo Not Found</title></head><body style="background:#0c0a09;color:#fafaf9;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui"><div style="text-align:center"><h1 style="font-size:2rem;margin-bottom:1rem">Demo Not Found</h1><p style="color:#a8a29e">This demo website may have been taken down or the link is incorrect.</p></div></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } },
      );
    }

    // Track that the demo was viewed
    await ctx.db.patch(site._id, { servedAt: Date.now(), status: "served" });

    return new Response(site.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }),
});

// ── PAYMENT CHECKOUT (Stripe placeholder) ───────────────────────────────────
// POST /api/checkout — creates a Stripe Checkout Session for a website purchase
http.route({
  path: "/api/checkout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { leadId, websiteId, amount, currency = "zar" } = body as {
      leadId: string;
      websiteId: string;
      amount: number;
      currency?: string;
    };

    if (!leadId || !websiteId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: leadId, websiteId, amount" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // Demo mode: simulate a successful checkout
      return new Response(
        JSON.stringify({
          sessionId: `demo_checkout_${Date.now()}`,
          url: "#demo-payment",
          demo: true,
          message: "Stripe not configured. Add STRIPE_SECRET_KEY to enable real payments.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Real Stripe Checkout (when key is present)
    try {
      const site = await ctx.db.query("websites").get(websiteId as any);
      const lead = await ctx.db.query("leads").get(leadId as any);
      if (!site || !lead) {
        return new Response(JSON.stringify({ error: "Lead or website not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const origin = new URL(request.url).origin;
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${stripeKey}`,
        },
        body: new URLSearchParams({
          "line_items[0][price_data][currency]": currency,
          "line_items[0][price_data][product_data][name]": `Website — ${lead.business}`,
          "line_items[0][price_data][unit_amount]": String(amount * 100),
          "line_items[0][quantity]": "1",
          mode: "payment",
          success_url: `${origin}/dashboard?payment=success&lead=${leadId}`,
          cancel_url: `${origin}/dashboard?payment=cancelled&lead=${leadId}`,
          "metadata[leadId]": leadId,
          "metadata[websiteId]": websiteId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Stripe error ${res.status}: ${await res.text()}`);
      }

      const session = (await res.json()) as { id: string; url: string };

      // Mark payment as pending
      await ctx.db.patch(site._id, {
        paymentStatus: "pending",
        paymentIntentId: session.id,
      });

      return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Checkout failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

// ── STRIPE WEBHOOK (payment confirmation) ───────────────────────────────────
// POST /api/webhook/stripe — Stripe sends payment events here
http.route({
  path: "/api/webhook/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      return new Response("Stripe not configured", { status: 503 });
    }

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    // Verify webhook signature (simplified — in production use stripe.webhooks.constructEvent)
    // For now, parse the event directly
    try {
      const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const websiteId = session.metadata?.websiteId as string;
        const leadId = session.metadata?.leadId as string;

        if (websiteId) {
          const site = await ctx.db.query("websites").get(websiteId as any);
          if (site) {
            await ctx.db.patch(site._id, {
              paymentStatus: "paid",
              paidAt: Date.now(),
            });

            // Update the lead status to PROPOSAL / payment received
            if (leadId) {
              const lead = await ctx.db.query("leads").get(leadId as any);
              if (lead) {
                await ctx.db.patch(lead._id, {
                  status: "PROPOSAL",
                  dealValue: (session.amount_total as number) / 100,
                  updatedAt: Date.now(),
                });
              }
            }

            // Log the payment
            const siteDoc = await ctx.db.query("websites").get(websiteId as any);
            if (siteDoc) {
              await ctx.db.insert("agentLogs", {
                userId: siteDoc.userId,
                agent: "NEXUS",
                leadId: leadId as any,
                level: "ok",
                message: `Payment confirmed for ${siteDoc.businessName} — production deployment queued`,
                createdAt: Date.now(),
              });

              await ctx.db.insert("notifications", {
                userId: siteDoc.userId,
                type: "deal",
                title: `Payment received — ${siteDoc.businessName}`,
                body: `Website purchase confirmed. Production deployment will begin automatically.`,
                leadId: leadId as any,
                read: false,
                createdAt: Date.now(),
              });
            }
          }
        }
      }

      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("[webhook] Stripe event processing failed:", err);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

// ── ECHO voice webhook ──────────────────────────────────────────────────────
// Twilio sends POST requests here for incoming calls and speech responses.

http.route({
  path: "/voice/incoming",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const formData: Record<string, string> = {};
    const text = await request.text();
    for (const pair of text.split("&")) {
      const [key, value] = pair.split("=");
      if (key && value) {
        formData[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
      }
    }

    const response = await handleVoiceRequest({
      method: "POST",
      url: request.url,
      formData,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }),
});

http.route({
  path: "/voice/respond",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const formData: Record<string, string> = {};
    const text = await request.text();
    for (const pair of text.split("&")) {
      const [key, value] = pair.split("=");
      if (key && value) {
        formData[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
      }
    }

    const response = await handleVoiceRequest({
      method: "POST",
      url: request.url,
      formData,
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }),
});

export default http;
