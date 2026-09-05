import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAgency, logAgent } from "./lib/sim";

export const getSettings = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("agencySettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .first();
  },
});

const pricingValidator = v.object({
  websiteFrom: v.number(),
  premiumWebsiteFrom: v.number(),
  websitePlusReceptionistFrom: v.number(),
  receptionistSetup: v.number(),
  receptionistMonthly: v.number(),
  maxRecommendedDiscount: v.optional(v.number()),
});

const emailValidator = v.object({
  provider: v.union(v.literal("resend")),
  fromAddress: v.optional(v.string()),
  fromName: v.optional(v.string()),
  dailyLimit: v.number(),
  bounceThreshold: v.number(),
  complaintThreshold: v.number(),
});

const outreachValidator = v.object({
  followUpDays: v.array(v.number()),
  maxFollowUps: v.number(),
  minHoursBetweenEmails: v.number(),
  replyWaitHours: v.number(),
});

export const updateSettings = mutation({
  args: {
    agencyName: v.optional(v.string()),
    agencySignature: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    targetIndustries: v.optional(v.array(v.string())),
    targetRegions: v.optional(v.array(v.string())),
    targetKeywords: v.optional(v.array(v.string())),
    excludedDomains: v.optional(v.array(v.string())),
    excludedEmails: v.optional(v.array(v.string())),
    pricing: v.optional(pricingValidator),
    email: v.optional(emailValidator),
    outreach: v.optional(outreachValidator),
    demoEmail: v.optional(v.string()),
    demoDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const settings = await getAgency(ctx, userId);
    if (!settings) throw new Error("Agency not initialized");

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }
    patch.updatedAt = Date.now();

    await ctx.db.patch(settings._id, patch as never);
    await logAgent(
      ctx,
      userId,
      "NEXUS",
      "info",
      "Agency configuration updated by owner",
    );
    return settings._id;
  },
});

export const toggleSafety = mutation({
  args: {
    key: v.union(
      v.literal("stopAllAgents"),
      v.literal("pauseEmail"),
      v.literal("pauseSales"),
      v.literal("pauseLeadHunter"),
      v.literal("pauseWebsiteBuilder"),
      v.literal("pauseReceptionist"),
    ),
    value: v.boolean(),
  },
  handler: async (ctx, { key, value }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const settings = await getAgency(ctx, userId);
    if (!settings) throw new Error("Agency not initialized");

    await ctx.db.patch(settings._id, {
      safety: { ...settings.safety, [key]: value },
      updatedAt: Date.now(),
    });
    await logAgent(
      ctx,
      userId,
      "NEXUS",
      value ? "warn" : "ok",
      value
        ? `Safety control engaged: ${key}`
        : `Safety control released: ${key}`,
    );
  },
});

export const setMode = mutation({
  args: { mode: v.union(v.literal("DEMO"), v.literal("LIVE")) },
  handler: async (ctx, { mode }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const settings = await getAgency(ctx, userId);
    if (!settings) throw new Error("Agency not initialized");

    await ctx.db.patch(settings._id, {
      operationMode: mode,
      updatedAt: Date.now(),
    });
    await logAgent(
      ctx,
      userId,
      "NEXUS",
      "info",
      mode === "LIVE"
        ? "Switched to LIVE mode — real email delivery and AI generation enabled"
        : "Switched to DEMO mode — simulated operation, no external sends",
    );
  },
});