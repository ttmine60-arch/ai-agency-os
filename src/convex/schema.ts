import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// ── Agency OS ────────────────────────────────────────────────────────────────

/** Industry categories the agency can target. */
export const INDUSTRIES = [
  "Construction",
  "Plumbing",
  "Electrician",
  "Mechanic / Auto Repair",
  "Restaurant / Cafe",
  "Salon / Barbershop",
  "Real Estate",
  "Landscaping",
  "Roofing",
  "Security",
  "Cleaning / Janitorial",
  "Gym / Fitness",
  "Hotel / Accommodation",
  "Home Services",
  "Professional Services",
  "Healthcare",
  "Retail",
  "Other",
] as const;

export const industryValidator = v.union(...INDUSTRIES.map((i) => v.literal(i)));
export type Industry = Infer<typeof industryValidator>;

/** Where a lead is in the pipeline. */
export const LEAD_STATUS = [
  "NEW",
  "RESEARCHING",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "DEMO_SENT",
  "INTERESTED",
  "MEETING",
  "PROPOSAL",
  "WON",
  "LOST",
  "OPTED_OUT",
] as const;

export const leadStatusValidator = v.union(...LEAD_STATUS.map((s) => v.literal(s)));
export type LeadStatus = Infer<typeof leadStatusValidator>;

/** Which autonomous agent is acting. */
export const AGENT_NAMES = [
  "NEXUS",
  "NOVA",
  "ATLAS",
  "VEX",
  "PIXEL",
  "ECHO",
  "MERCURY",
  "ORION",
] as const;

export const agentNameValidator = v.union(...AGENT_NAMES.map((a) => v.literal(a)));
export type AgentName = Infer<typeof agentNameValidator>;

/** Live / demo mode controls what the system is allowed to do. */
export const OPERATION_MODE = [
  "DEMO",
  "LIVE",
] as const;
export const operationModeValidator = v.union(...OPERATION_MODE.map((m) => v.literal(m)));
export type OperationMode = Infer<typeof operationModeValidator>;

/** Safety toggle names for the emergency control panel. */
export const SAFETY_TOGGLE_KEYS = [
  "stopAllAgents",
  "pauseEmail",
  "pauseSales",
  "pauseLeadHunter",
  "pauseWebsiteBuilder",
  "pauseReceptionist",
] as const;

export const safetyToggleKeyValidator = v.union(
  ...SAFETY_TOGGLE_KEYS.map((k) => v.literal(k)),
);
export type SafetyToggleKey = Infer<typeof safetyToggleKeyValidator>;

// ── Tables ───────────────────────────────────────────────────────────────────

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Agency settings (one per owner, stored on the user document) ────────────
    agencySettings: defineTable({
      // Core business identity
      agencyName: v.optional(v.string()),
      agencySignature: v.optional(v.string()),
      ownerEmail: v.optional(v.string()),

      // Target market
      targetIndustries: v.array(v.string()),
      targetRegions: v.array(v.string()),
      targetKeywords: v.array(v.string()),
      excludedDomains: v.array(v.string()),
      excludedEmails: v.array(v.string()),

      // Pricing (ZAR). Editable by owner. NEXUS recommends within these bounds.
      pricing: defineTable({
        websiteFrom: v.number(),
        premiumWebsiteFrom: v.number(),
        websitePlusReceptionistFrom: v.number(),
        receptionistSetup: v.number(),
        receptionistMonthly: v.number(),
        maxRecommendedDiscount: v.optional(v.number()),
      }),

      // Deliverability
      email: defineTable({
        provider: v.enum("resend"),
        fromAddress: v.optional(v.string()),
        fromName: v.optional(v.string()),
        dailyLimit: v.number(),
        bounceThreshold: v.number(),
        complaintThreshold: v.number(),
      }),

      // Outreach behavior
      outreach: defineTable({
        followUpDays: v.array(v.number()),
        maxFollowUps: v.number(),
        minHoursBetweenEmails: v.number(),
        replyWaitHours: v.number(),
      }),

      // Safety + emergency controls
      safety: defineTable({
        stopAllAgents: v.boolean(),
        pauseEmail: v.boolean(),
        pauseSales: v.boolean(),
        pauseLeadHunter: v.boolean(),
        pauseWebsiteBuilder: v.boolean(),
        pauseReceptionist: v.boolean(),
      }),

      // Metrics for autonomous learning.
      metrics: defineTable({
        leadsCreated: v.number(),
        emailsSent: v.number(),
        repliesReceived: v.number(),
        demosSent: v.number(),
        demosViewed: v.number(),
        meetingsBooked: v.number(),
        dealsWon: v.number(),
        dealValueWon: v.number(),
        // per-industry performance: industry -> { leads, replies, demos, won, value }
        industryPerformance: v.map(v.string(), v.object({
          leads: v.number(),
          replies: v.number(),
          demos: v.number(),
          won: v.number(),
          value: v.number(),
          score: v.number(),
        })),
      }),

      // Mode
      operationMode: v.enum("DEMO", "LIVE"),

      // Demo-mode defaults (used when no live API keys are configured)
      demoEmail: v.optional(v.string()),
      demoDomain: v.optional(v.string()),

      // Timestamps
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("byUser", ["userId"]),

    // ── Agents ──────────────────────────────────────────────────────────────────
    agents: defineTable(
      {
        name: v.string(),
        displayName: v.string(),
        role: v.string(),
        status: v.enum(
          "idle",
          "working",
          "searching",
          "analyzing",
          "building",
          "talking",
          "online",
          "monitoring",
          "watching",
          "error",
          "paused",
        ),
        statusMessage: v.optional(v.string()),
        // lastHeartbeat is set by the worker loop so the dashboard can show
        // whether an agent is actually alive.
        lastHeartbeat: v.number(),
        lastAction: v.optional(v.string()),
        lastActionAt: v.optional(v.number()),
        paused: v.boolean(),
        // optional tie to a lead the agent is currently working on
        currentLeadId: v.optional(v.id("leads")),
      },
    )
      .index("byName", ["name"])
      .index("byStatus", ["status"]),

    // ── Leads (CRM) ─────────────────────────────────────────────────────────────
    leads: defineTable(
      {
        // Identity
        business: v.string(),
        industry: v.optional(v.string()),
        location: v.optional(v.string()),
        website: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
        businessDescription: v.optional(v.string()),

        // Discovery source
        discoveredBy: v.optional(v.string()),
        discoveredVia: v.optional(v.string()),
        discoveredAt: v.optional(v.number()),

        // Research
        researchSummary: v.optional(v.string()),
        websiteScore: v.optional(v.number()),
        opportunityScore: v.optional(v.number()),
        recommendedProduct: v.optional(
          v.union(
            v.literal("WEBSITE"),
            v.literal("PREMIUM_WEBSITE"),
            v.literal("WEBSITE_PLUS_RECEPTIONIST"),
            v.literal("AI_RECEPTIONIST"),
            v.literal("NONE"),
          ),
        ),
        recommendedPrice: v.optional(v.number()),
        recommendationReason: v.optional(v.string()),
        weaknesses: v.optional(v.array(v.string())),
        services: v.optional(v.array(v.string())),

        // Demo / outreach
        demoUrl: v.optional(v.string()),
        receptionistDemoUrl: v.optional(v.string()),
        receptionistKnowledgeBase: v.optional(v.string()),
        lastOfferSubject: v.optional(v.string()),
        lastOfferBody: v.optional(v.string()),

        // Conversation state
        status: v.enum(
          "NEW",
          "RESEARCHING",
          "QUALIFIED",
          "CONTACTED",
          "REPLIED",
          "DEMO_SENT",
          "INTERESTED",
          "MEETING",
          "PROPOSAL",
          "WON",
          "LOST",
          "OPTED_OUT",
        ),
        conversation: v.optional(v.string()),
        lastMessageFromProspect: v.optional(v.string()),
        lastMessageFromVex: v.optional(v.string()),
        lastContactAt: v.optional(v.number()),

        // Deal state
        nextAction: v.optional(v.string()),
        nextActionAt: v.optional(v.number()),
        appointment: v.optional(
          v.object({
            scheduledAt: v.optional(v.number()),
            title: v.optional(v.string()),
            with: v.optional(v.string()),
            notes: v.optional(v.string()),
          }),
        ),
        dealValue: v.optional(v.number()),
        highIntent: v.boolean(),

        // Owner notification flags
        notifyHighIntent: v.boolean(),
        notifyMeeting: v.boolean(),
        notifyDeal: v.boolean(),

        // Metadata
        leadScore: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
      },
    )
      .index("byStatus", ["status"])
      .index("byIndustry", ["industry"])
      .index("byCreatedAt", ["createdAt"])
      .index("byBusiness", ["business"])
      .index("byEmail", ["email"])
      .index("byWebsite", ["website"]),

    // ── Outreach events (for audit, deliverability, and learning) ────────────────
    outreachEvents: defineTable(
      {
        leadId: v.id("leads"),
        type: v.enum("discovered", "researched", "offer_sent", "reply_received", "demo_sent", "demo_viewed", "follow_up_sent", "appointment_booked", "status_changed", "deal_won", "deal_lost", "opted_out", "email_bounce", "email_complaint"),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
        // For offer_sent / reply events, capture the raw text so the owner can read it.
        fromProspect: v.optional(v.boolean()),
        metadata: v.optional(v.string()), // JSON string for structured extra data
        createdAt: v.number(),
      },
    ).index("byLeadId", ["leadId"]),

    // ── Agent logs (persisted, queryable, for transparency) ─────────────────────
    agentLogs: defineTable(
      {
        agent: v.string(),
        leadId: v.optional(v.id("leads")),
        level: v.enum("info", "ok", "warn", "error"),
        message: v.string(),
        detail: v.optional(v.string()),
        createdAt: v.number(),
      },
    ).index("byAgent", ["agent"]),

    // ── Notifications (for the owner) ───────────────────────────────────────────
    notifications: defineTable(
      {
        id: v.string(),
        type: v.enum("high_intent", "meeting", "deal", "error", "info"),
        title: v.string(),
        body: v.optional(v.string()),
        leadId: v.optional(v.id("leads")),
        read: v.boolean(),
        createdAt: v.number(),
      },
    ).index("byCreatedAt", ["createdAt"]),

    // ── Demo builds (PIXEL artifact tracking) ───────────────────────────────────
    demoBuilds: defineTable(
      {
        leadId: v.id("leads"),
        kind: v.enum("website", "receptionist"),
        status: v.enum("queued", "building", "built", "deployed", "failed"),
        deployUrl: v.optional(v.string()),
        error: v.optional(v.string()),
        startedAt: v.optional(v.number()),
        finishedAt: v.optional(v.number()),
      },
    ).index("byLeadId", ["leadId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
