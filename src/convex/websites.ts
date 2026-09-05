import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/** Get a website by its URL slug (used by the demo serving route). */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("websites")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/** Get a website by ID. */
export const getById = query({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.websiteId);
  },
});

/** Get a lead by ID (used by payment flow). */
export const getLeadById = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
  },
});

/** Mark a website as served (called when someone views the demo). */
export const markServed = mutation({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.websiteId, {
      servedAt: Date.now(),
      status: "served",
    });
  },
});

/** Mark payment as pending (Stripe checkout session created). */
export const markPaymentPending = mutation({
  args: {
    websiteId: v.id("websites"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.websiteId, {
      paymentStatus: "pending",
      paymentIntentId: args.paymentIntentId,
    });
  },
});

/** Mark website as paid (called by Stripe webhook). */
export const markPaid = mutation({
  args: {
    websiteId: v.id("websites"),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.websiteId);
    if (!site) return;

    await ctx.db.patch(args.websiteId, {
      paymentStatus: "paid",
      paidAt: Date.now(),
    });

    // Update the lead
    if (args.leadId) {
      const lead = await ctx.db.get(args.leadId);
      if (lead) {
        await ctx.db.patch(lead._id, {
          status: "PROPOSAL",
          updatedAt: Date.now(),
        });
      }
    }

    // Log the payment
    await ctx.db.insert("agentLogs", {
      userId: site.userId,
      agent: "NEXUS",
      leadId: args.leadId,
      level: "ok",
      message: `Payment confirmed for ${site.businessName} — production deployment queued`,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: site.userId,
      type: "deal",
      title: `Payment received — ${site.businessName}`,
      body: `Website purchase confirmed. Production deployment will begin automatically.`,
      leadId: args.leadId,
      read: false,
      createdAt: Date.now(),
    });
  },
});

/** List all websites for a user. */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("websites")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
