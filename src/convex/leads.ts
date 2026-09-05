import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAgency, logAgent, trackEvent } from "./lib/sim";

export const listLeads = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const leads = await ctx.db
      .query("leads")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    return leads.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.userId !== userId) return null;

    const events = await ctx.db
      .query("outreachEvents")
      .withIndex("byLeadId", (q) => q.eq("leadId", leadId))
      .collect();
    const builds = await ctx.db
      .query("demoBuilds")
      .withIndex("byLeadId", (q) => q.eq("leadId", leadId))
      .collect();
    return {
      lead,
      events: events.sort((a, b) => a.createdAt - b.createdAt),
      builds: builds.sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0)),
    };
  },
});

/** Manual owner override — NEXUS keeps the pipeline consistent. */
export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(
      v.literal("NEW"),
      v.literal("RESEARCHING"),
      v.literal("QUALIFIED"),
      v.literal("CONTACTED"),
      v.literal("REPLIED"),
      v.literal("DEMO_SENT"),
      v.literal("INTERESTED"),
      v.literal("MEETING"),
      v.literal("PROPOSAL"),
      v.literal("WON"),
      v.literal("LOST"),
      v.literal("OPTED_OUT"),
    ),
  },
  handler: async (ctx, { leadId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const lead = await ctx.db.get(leadId);
    if (!lead || lead.userId !== userId) throw new Error("Lead not found");

    const from = lead.status;
    const t = Date.now();
    await ctx.db.patch(leadId, {
      status,
      updatedAt: t,
      nextAction: undefined,
      nextActionAt: undefined,
    });
    await trackEvent(ctx, userId, leadId, "status_changed", {
      metadata: JSON.stringify({ from, to: status, by: "owner" }),
      createdAt: t,
    });

    // Keep metrics honest when the owner closes a deal by hand.
    if (status === "WON" && from !== "WON") {
      const settings = await getAgency(ctx, userId);
      if (settings) {
        const value = lead.recommendedPrice ?? settings.pricing.websiteFrom;
        await ctx.db.patch(settings._id, {
          metrics: {
            ...settings.metrics,
            dealsWon: settings.metrics.dealsWon + 1,
            dealValueWon: settings.metrics.dealValueWon + value,
          },
        });
      }
    }

    await logAgent(
      ctx,
      userId,
      "NEXUS",
      "info",
      `Owner moved ${lead.business}: ${from} → ${status}`,
      { leadId },
    );
  },
});