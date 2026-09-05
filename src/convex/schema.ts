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

/** Shorthand for a union of string literals (v.enum was removed in Convex 1.42). */
const en = <T extends string>(...values: T[]) =>
  v.union(...values.map((value) => v.literal(value)));

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

export const industryValidator = en(...INDUSTRIES);
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

export const leadStatusValidator = en(...LEAD_STATUS);
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

export const agentNameValidator = en(...AGENT_NAMES);
export type AgentName = Infer<typeof agentNameValidator>;

/** Live / demo mode controls what the system is allowed to do. */
export const OPERATION_MODE = ["DEMO", "LIVE"] as const;
export const operationModeValidator = en(...OPERATION_MODE);
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

export const safetyToggleKeyValidator = en(...SAFETY_TOGGLE_KEYS);
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

    // ── Agency settings (one per owner) ─────────────────────────────────────────
    agencySettings: defineTable({
      userId: v.id("users"),

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
      pricing: v.object({
        websiteFrom: v.number(),
        premiumWebsiteFrom: v.number(),
        websitePlusReceptionistFrom: v.number(),
        receptionistSetup: v.number(),
        receptionistMonthly: v.number(),
        maxRecommendedDiscount: v.optional(v.number()),
      }),

      // Deliverability
      email: v.object({
        provider: en("resend"),
        fromAddress: v.optional(v.string()),
        fromName: v.optional(v.string()),
        dailyLimit: v.number(),
        bounceThreshold: v.number(),
        complaintThreshold: v.number(),
      }),

      // Outreach behavior
      outreach: v.object({
        followUpDays: v.array(v.number()),
        maxFollowUps: v.number(),
        minHoursBetweenEmails: v.number(),
        replyWaitHours: v.number(),
      }),

      // Safety + emergency controls
      safety: v.object({
        stopAllAgents: v.boolean(),
        pauseEmail: v.boolean(),
        pauseSales: v.boolean(),
        pauseLeadHunter: v.boolean(),
        pauseWebsiteBuilder: v.boolean(),
        pauseReceptionist: v.boolean(),
      }),

      // Metrics for autonomous learning.
      metrics: v.object({
        leadsCreated: v.number(),
        emailsSent: v.number(),
        repliesReceived: v.number(),
        demosSent: v.number(),
        demosViewed: v.number(),
        meetingsBooked: v.number(),
        dealsWon: v.number(),
        dealValueWon: v.number(),
        // per-industry performance: industry -> { leads, replies, demos, won, value }
        industryPerformance: v.record(
          v.string(),
          v.object({
            leads: v.number(),
            replies: v.number(),
            demos: v.number(),
            won: v.number(),
            value: v.number(),
            score: v.number(),
          }),
        ),
      }),

      // Mode
      operationMode: en("DEMO", "LIVE"),

      // Demo-mode defaults (used when no live API keys are configured)
      demoEmail: v.optional(v.string()),
      demoDomain: v.optional(v.string()),

      // True once first-run setup + demo seeding has completed
      initialized: v.optional(v.boolean()),

      // Timestamps
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("byUser", ["userId"]),

    // ── Agents (one roster per owner) ───────────────────────────────────────────
    agents: defineTable(
      {
        userId: v.id("users"),
        name: en("NEXUS", "NOVA", "ATLAS", "VEX", "PIXEL", "ECHO", "MERCURY", "ORION"),
        displayName: v.string(),
        role: v.string(),
        status: en(
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
      .index("byUser", ["userId"])
      .index("byName", ["name"])
      .index("byStatus", ["status"]),

    // ── Leads (CRM) ─────────────────────────────────────────────────────────────
    leads: defineTable(
      {
        userId: v.id("users"),

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
          en(
            "WEBSITE",
            "PREMIUM_WEBSITE",
            "WEBSITE_PLUS_RECEPTIONIST",
            "AI_RECEPTIONIST",
            "NONE",
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
        status: en(
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
        // ORION's estimate of how likely this deal is to close (0-100)
        winProbability: v.optional(v.number()),
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
      .index("byUser", ["userId"])
      .index("byStatus", ["status"])
      .index("byIndustry", ["industry"])
      .index("byCreatedAt", ["createdAt"])
      .index("byBusiness", ["business"])
      .index("byEmail", ["email"])
      .index("byWebsite", ["website"]),

    // ── Outreach events (for audit, deliverability, and learning) ────────────────
    outreachEvents: defineTable(
      {
        userId: v.id("users"),
        leadId: v.id("leads"),
        type: en(
          "discovered",
          "researched",
          "offer_sent",
          "reply_received",
          "demo_sent",
          "demo_viewed",
          "follow_up_sent",
          "appointment_booked",
          "status_changed",
          "deal_won",
          "deal_lost",
          "opted_out",
          "email_bounce",
          "email_complaint",
        ),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
        // For offer_sent / reply events, capture the raw text so the owner can read it.
        fromProspect: v.optional(v.boolean()),
        metadata: v.optional(v.string()), // JSON string for structured extra data
        createdAt: v.number(),
      },
    )
      .index("byUser", ["userId"])
      .index("byLeadId", ["leadId"]),

    // ── Agent logs (persisted, queryable, for transparency) ─────────────────────
    agentLogs: defineTable(
      {
        userId: v.id("users"),
        agent: en(
          "NEXUS",
          "NOVA",
          "ATLAS",
          "VEX",
          "PIXEL",
          "ECHO",
          "MERCURY",
          "ORION",
        ),
        leadId: v.optional(v.id("leads")),
        level: en("info", "ok", "warn", "error"),
        message: v.string(),
        detail: v.optional(v.string()),
        createdAt: v.number(),
      },
    )
      .index("byUser", ["userId"])
      .index("byAgent", ["agent"])
      .index("byCreatedAt", ["createdAt"]),

    // ── Notifications (for the owner) ───────────────────────────────────────────
    notifications: defineTable(
      {
        userId: v.id("users"),
        type: en("high_intent", "meeting", "deal", "error", "info"),
        title: v.string(),
        body: v.optional(v.string()),
        leadId: v.optional(v.id("leads")),
        read: v.boolean(),
        createdAt: v.number(),
      },
    )
      .index("byUser", ["userId"])
      .index("byCreatedAt", ["createdAt"]),

    // ── Demo builds (PIXEL artifact tracking) ───────────────────────────────────
    demoBuilds: defineTable(
      {
        userId: v.id("users"),
        leadId: v.id("leads"),
        kind: en("website", "receptionist"),
        status: en("queued", "building", "built", "deployed", "failed"),
        deployUrl: v.optional(v.string()),
        error: v.optional(v.string()),
        startedAt: v.optional(v.number()),
        finishedAt: v.optional(v.number()),
      },
    )
      .index("byUser", ["userId"])
      .index("byLeadId", ["leadId"]),

    // ── Owner instructions (command chat → NEXUS) ───────────────────────────────
    instructions: defineTable(
      {
        userId: v.id("users"),
        author: en("owner", "system"),
        agent: v.optional(
          en("NEXUS", "NOVA", "ATLAS", "VEX", "PIXEL", "ECHO", "MERCURY", "ORION"),
        ),
        text: v.string(),
        status: en("queued", "processing", "done", "failed"),
        response: v.optional(v.string()),
        createdAt: v.number(),
        processedAt: v.optional(v.number()),
      },
    )
      .index("byUser", ["userId"])
      .index("byCreatedAt", ["createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;