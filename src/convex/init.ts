import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { ensureAgents, getAgency, seedPipeline } from "./lib/sim";

/**
 * First-run setup for a new owner:
 *  1. creates agency settings with sensible defaults,
 *  2. spins up the 8-agent roster,
 *  3. seeds a realistic demo pipeline so the command center is alive
 *     immediately (DEMO mode only).
 *
 * Idempotent — safe to call on every dashboard mount.
 */
export const ensureAgency = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    let settings = await getAgency(ctx, userId);

    if (!settings) {
      const t = Date.now();
      const id = await ctx.db.insert("agencySettings", {
        userId,
        agencyName: "B2K Agency",
        agencySignature: "The B2K Agency team",
        ownerEmail: user?.email ?? undefined,
        targetIndustries: [
          "Construction",
          "Plumbing",
          "Electrician",
          "Roofing",
          "Mechanic / Auto Repair",
          "Salon / Barbershop",
          "Gym / Fitness",
          "Restaurant / Cafe",
          "Real Estate",
          "Landscaping",
          "Security",
          "Cleaning / Janitorial",
          "Hotel / Accommodation",
          "Healthcare",
          "Professional Services",
          "Home Services",
        ],
        targetRegions: ["Gauteng", "Western Cape", "KwaZulu-Natal"],
        targetKeywords: ["no website", "outdated website", "missed calls"],
        excludedDomains: [],
        excludedEmails: [],
        pricing: {
          websiteFrom: 4500,
          premiumWebsiteFrom: 8500,
          websitePlusReceptionistFrom: 12500,
          receptionistSetup: 2500,
          receptionistMonthly: 950,
          maxRecommendedDiscount: 500,
        },
        email: {
          provider: "resend",
          fromAddress: undefined,
          fromName: "B2K Agency",
          dailyLimit: 30,
          bounceThreshold: 3,
          complaintThreshold: 2,
        },
        outreach: {
          followUpDays: [2, 5, 9],
          maxFollowUps: 3,
          minHoursBetweenEmails: 12,
          replyWaitHours: 48,
        },
        safety: {
          stopAllAgents: false,
          pauseEmail: false,
          pauseSales: false,
          pauseLeadHunter: false,
          pauseWebsiteBuilder: false,
          pauseReceptionist: false,
        },
        metrics: {
          leadsCreated: 0,
          emailsSent: 0,
          repliesReceived: 0,
          demosSent: 0,
          demosViewed: 0,
          meetingsBooked: 0,
          dealsWon: 0,
          dealValueWon: 0,
          industryPerformance: {},
        },
        operationMode: "DEMO",
        demoEmail: user?.email ?? undefined,
        demoDomain: "demo.b2kagency.app",
        initialized: true,
        createdAt: t,
        updatedAt: t,
      });
      settings = await ctx.db.get(id);
    }

    await ensureAgents(ctx, userId);

    // Seed the demo pipeline exactly once — only if the owner has no leads yet.
    if (settings) {
      const leadCount = await ctx.db
        .query("leads")
        .withIndex("byUser", (q) => q.eq("userId", userId))
        .collect();
      if (leadCount.length === 0) {
        await seedPipeline(ctx, userId, settings);
      }
    }

    return settings?._id ?? null;
  },
});