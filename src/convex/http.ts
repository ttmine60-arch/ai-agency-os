import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { handleVoiceRequest } from "./lib/voice";

const http = httpRouter();

auth.addHttpRoutes(http);

// ── DEMO WEBSITE SERVING ────────────────────────────────────────────────────
// Serves generated premium demo websites by slug.
http.route({
  path: "/demo/:slug",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const slug = url.pathname.split("/demo/")[1];
    if (!slug) {
      return new Response("Not found", { status: 404 });
    }

    // Look up the website by slug using ctx.runQuery
    const site = await ctx.runQuery(
      (await import("../_generated/api")).default.websites.getBySlug,
      { slug },
    );

    if (!site) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Demo Not Found</title></head><body style="background:#0c0a09;color:#fafaf9;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui"><div style="text-align:center"><h1 style="font-size:2rem;margin-bottom:1rem">Demo Not Found</h1><p style="color:#a8a29e">This demo website may have been taken down or the link is incorrect.</p></div></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } },
      );
    }

    // Mark as served
    await ctx.runMutation(
      (await import("../_generated/api")).default.websites.markServed,
      { websiteId: site._id },
    );

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

// ── PAYMENT CHECKOUT ────────────────────────────────────────────────────────
http.route({
  path: "/api/checkout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { leadId, websiteId, amount, currency = "zar" } = body as Record<string, string | number>;

    if (!leadId || !websiteId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: leadId, websiteId, amount" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
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

    try {
      const api = (await import("../_generated/api")).default;
      const site = await ctx.runQuery(api.websites.getById, { websiteId: websiteId as string });
      const lead = await ctx.runQuery(api.leads.getById, { leadId: leadId as string });
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
          "line_items[0][price_data][currency]": currency as string,
          "line_items[0][price_data][product_data][name]": `Website — ${lead.business}`,
          "line_items[0][price_data][unit_amount]": String(Number(amount) * 100),
          "line_items[0][quantity]": "1",
          mode: "payment",
          success_url: `${origin}/dashboard?payment=success&lead=${leadId}`,
          cancel_url: `${origin}/dashboard?payment=cancelled&lead=${leadId}`,
          "metadata[leadId]": leadId as string,
          "metadata[websiteId]": websiteId as string,
        }),
      });

      if (!res.ok) throw new Error(`Stripe error ${res.status}: ${await res.text()}`);
      const session = (await res.json()) as { id: string; url: string };

      await ctx.runMutation(api.websites.markPaymentPending, {
        websiteId: websiteId as string,
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

// ── STRIPE WEBHOOK ──────────────────────────────────────────────────────────
http.route({
  path: "/api/webhook/stripe",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return new Response("Stripe not configured", { status: 503 });

    try {
      const body = await request.json();
      const event = body as { type: string; data: { object: Record<string, unknown> } };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const websiteId = (session.metadata as Record<string, string>)?.websiteId;
        const leadId = (session.metadata as Record<string, string>)?.leadId;

        if (websiteId) {
          const api = (await import("../_generated/api")).default;
          await _ctx.runMutation(api.websites.markPaid, {
            websiteId,
            leadId: leadId ?? undefined,
          });
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
    const response = await handleVoiceRequest({ method: "POST", url: request.url, formData });
    return new Response(response.body, { status: response.status, headers: response.headers });
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
    const response = await handleVoiceRequest({ method: "POST", url: request.url, formData });
    return new Response(response.body, { status: response.status, headers: response.headers });
  }),
});

export default http;
