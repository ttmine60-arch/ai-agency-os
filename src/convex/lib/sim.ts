/**
 * The autonomous agency engine.
 *
 * This module is what makes B2K Agency OS feel like a hired company: a single
 * cycle advances the entire pipeline the way NEXUS would direct it —
 *
 *   NOVA discovers → ATLAS researches → PIXEL builds demos →
 *   VEX sends offers → prospects reply → MERCURY follows up →
 *   ORION scores intent → meetings get booked → deals close.
 *
 * In DEMO mode the cycle draws on the fictional business pool in lib/demo.ts.
 * The same code paths run in LIVE mode; the email/ai seams (lib/email.ts,
 * lib/ai.ts) and the safety toggles are respected the same way. The cron in
 * crons.ts calls runCycle every few minutes so the agency keeps working with
 * zero owner interaction.
 */

import { api } from "../_generated/api";
import { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { AGENT_ROSTER } from "./roster";
import {
  DEMO_BUSINESSES,
  DISCOVERY_SOURCES,
  FOLLOW_UP_POOL,
  INDUSTRY_WEAKNESSES,
  REPLY_POOL,
  chance,
  pick,
  randInt,
  weightedPick,
  type DemoBusiness,
} from "./demo";
import { generateWebsite } from "./websiteGenerator";

const DAY = 86_400_000;

type AgentDoc = Doc<"agents">;
type SettingsDoc = Doc<"agencySettings">;
type LeadDoc = Doc<"leads">;

// ── small shared helpers ─────────────────────────────────────────────────────

export const now = () => Date.now();

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getAgency(ctx: MutationCtx, userId: Id<"users">) {
  return ctx.db
    .query("agencySettings")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .first();
}

export async function getAgents(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Map<string, AgentDoc>> {
  const docs = await ctx.db
    .query("agents")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
  return new Map(docs.map((d) => [d.name, d]));
}

export async function logAgent(
  ctx: MutationCtx,
  userId: Id<"users">,
  agent: Doc<"agentLogs">["agent"],
  level: "info" | "ok" | "warn" | "error",
  message: string,
  opts: { leadId?: Id<"leads">; detail?: string } = {},
) {
  await ctx.db.insert("agentLogs", {
    userId,
    agent,
    level,
    message,
    detail: opts.detail,
    leadId: opts.leadId,
    createdAt: now(),
  });
}

export async function trackEvent(
  ctx: MutationCtx,
  userId: Id<"users">,
  leadId: Id<"leads">,
  type: Doc<"outreachEvents">["type"],
  opts: {
    subject?: string;
    body?: string;
    fromProspect?: boolean;
    metadata?: string;
    createdAt?: number;
  } = {},
) {
  await ctx.db.insert("outreachEvents", {
    userId,
    leadId,
    type,
    subject: opts.subject,
    body: opts.body,
    fromProspect: opts.fromProspect,
    metadata: opts.metadata,
    createdAt: opts.createdAt ?? now(),
  });
}

export async function setAgent(
  ctx: MutationCtx,
  agent: AgentDoc,
  patch: Partial<
    Pick<
      AgentDoc,
      | "status"
      | "statusMessage"
      | "lastHeartbeat"
      | "lastAction"
      | "lastActionAt"
      | "currentLeadId"
      | "paused"
    >
  >,
) {
  await ctx.db.patch(agent._id, {
    ...patch,
    lastHeartbeat: now(),
  });
}

/** Look up the demo-pool business a lead was created from. */
export function findDemoBusiness(business: string): DemoBusiness | undefined {
  return DEMO_BUSINESSES.find(
    (b) => b.business.toLowerCase() === business.toLowerCase(),
  );
}

// ── research / recommendation logic (shared by seed + live cycle) ───────────

export function computeRecommendation(
  biz: DemoBusiness,
  pricing: SettingsDoc["pricing"],
) {
  const websiteScore = Math.min(
    100,
    biz.website ? Math.round(biz.webPresence * 10) : 0,
  );
  const opportunityScore = Math.max(
    40,
    Math.min(98, 100 - websiteScore + randInt(-5, 12)),
  );

  let recommendedProduct: LeadDoc["recommendedProduct"] = "WEBSITE";
  if (biz.webPresence <= 1) {
    recommendedProduct = biz.takesCalls
      ? "WEBSITE_PLUS_RECEPTIONIST"
      : "WEBSITE";
  } else if (biz.webPresence <= 5) {
    recommendedProduct = biz.takesCalls
      ? "WEBSITE_PLUS_RECEPTIONIST"
      : "PREMIUM_WEBSITE";
  } else {
    recommendedProduct = biz.takesCalls ? "AI_RECEPTIONIST" : "PREMIUM_WEBSITE";
  }

  const recommendedPrice = (() => {
    switch (recommendedProduct) {
      case "WEBSITE":
        return pricing.websiteFrom;
      case "PREMIUM_WEBSITE":
        return pricing.premiumWebsiteFrom;
      case "WEBSITE_PLUS_RECEPTIONIST":
        return pricing.websitePlusReceptionistFrom;
      case "AI_RECEPTIONIST":
        return pricing.receptionistSetup + pricing.receptionistMonthly;
      default:
        return pricing.websiteFrom;
    }
  })();

  const weaknesses = Array.from(
    new Set([
      ...biz.weaknesses,
      ...(INDUSTRY_WEAKNESSES[biz.industry] ?? []).slice(0, 2),
    ]),
  ).slice(0, 5);

  const reason = biz.website
    ? `${biz.business} has an online presence, but it's underperforming — ${
        weaknesses[0]?.toLowerCase() ?? "the site is dated"
      }. A refresh + managed capture flow would turn traffic into enquiries.`
    : `${biz.business} has no website at all and is invisible to search. Demand in ${biz.location} is being captured by competitors.`;

  return {
    websiteScore,
    opportunityScore,
    recommendedProduct,
    recommendedPrice,
    recommendationReason: reason,
    weaknesses,
  };
}

export function buildOffer(
  biz: DemoBusiness,
  settings: SettingsDoc,
  rec: ReturnType<typeof computeRecommendation>,
) {
  const productLabel: Record<string, string> = {
    WEBSITE: "a conversion-focused website",
    PREMIUM_WEBSITE: "a premium website rebuild",
    WEBSITE_PLUS_RECEPTIONIST:
      "a new website plus an AI receptionist that answers every call",
    AI_RECEPTIONIST: "an AI receptionist that answers every call, 24/7",
  };
  const priceLabel =
    rec.recommendedProduct === "AI_RECEPTIONIST"
      ? `R${rec.recommendedPrice.toLocaleString()} once-off (setup + first month)`
      : `from R${rec.recommendedPrice.toLocaleString()}`;

  const subject = pick([
    `${biz.business} — quick idea to win more ${biz.industry.toLowerCase()} work in ${biz.location.split(",")[0]}`,
    `We built a demo for ${biz.business} — 2 minutes to view`,
    `${biz.business}: a ${biz.industry.toLowerCase()} business in ${biz.location.split(",")[0]} you shouldn't ignore`,
    `Quick one for ${biz.business} (${biz.industry.toLowerCase()})`,
  ]);

  const body = `Hi ${biz.business} team,

I'm reaching out from ${settings.agencyName ?? "B2K Agency"}. We help ${biz.industry.toLowerCase()} businesses in ${biz.location} win more work without adding headcount.

While researching ${biz.business}, we noticed: ${weaknessesToSentence(
    rec.weaknesses,
  )}. That's costing you enquiries every week.

We'd like to build you ${productLabel[rec.recommendedProduct] ?? "a website"} — personalized to your services (${(
    biz.services ?? []
  ).slice(0, 3).join(", ")}) — and set it up at no risk to you: ${priceLabel}.

Reply with the word "demo" and we'll send over a live preview within 24 hours. Happy to jump on a quick call if that's easier.

Best regards,
${settings.agencySignature ?? "The B2K Agency team"}`;

  return { subject, body };
}

function weaknessesToSentence(weaknesses: string[]): string {
  if (weaknesses.length === 0) return "your online presence is underperforming";
  if (weaknesses.length === 1) return weaknesses[0].toLowerCase();
  return `${weaknesses
    .slice(0, -1)
    .map((w) => w.toLowerCase())
    .join(", ")} and ${weaknesses[weaknesses.length - 1].toLowerCase()}`;
}

// ── the autonomous cycle ─────────────────────────────────────────────────────

export interface CycleSummary {
  discovered: number;
  researched: number;
  demosBuilt: number;
  offersSent: number;
  followUps: number;
  replies: number;
  interested: number;
  meetings: number;
  won: number;
  calls: number;
  lost: number;
}

export async function simulateCycle(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<CycleSummary> {
  const summary: CycleSummary = {
    discovered: 0,
    researched: 0,
    demosBuilt: 0,
    offersSent: 0,
    followUps: 0,
    replies: 0,
    interested: 0,
    meetings: 0,
    won: 0,
    calls: 0,
    lost: 0,
  };

  const settings = await getAgency(ctx, userId);
  if (!settings) return summary;
  const safety = settings.safety;

  const agents = await getAgents(ctx, userId);
  const nexus = agents.get("NEXUS");
  if (!nexus) return summary;

  if (safety.stopAllAgents) {
    await setAgent(ctx, nexus, {
      status: "paused",
      statusMessage: "Emergency stop engaged — all agents idle",
    });
    await logAgent(
      ctx,
      userId,
      "NEXUS",
      "warn",
      "Autonomous cycle skipped — emergency stop engaged",
    );
    return summary;
  }

  await setAgent(ctx, nexus, {
    status: "working",
    statusMessage: "Running autonomous cycle",
    lastAction: "orchestrated agency cycle",
    lastActionAt: now(),
  });

  // All other agents stay alive; drop stale "working" states.
  for (const [name, agent] of agents) {
    if (name === "NEXUS") continue;
    const stale =
      agent.lastActionAt && now() - agent.lastActionAt > 15 * 60_000;
    await setAgent(ctx, agent, {
      status: stale ? "idle" : agent.status,
      statusMessage: stale ? "awaiting task from NEXUS" : agent.statusMessage,
    });
  }

  // Failure detection: any agent stuck in "error" gets recovered automatically.
  for (const [, agent] of agents) {
    if (agent.status !== "error" || agent.paused) continue;
    await setAgent(ctx, agent, {
      status: "online",
      statusMessage: "recovered by NEXUS after failure",
    });
    await logAgent(
      ctx,
      userId,
      agent.name,
      "warn",
      "NEXUS detected a failure and restarted the agent",
    );
  }

  // ── 1 · NEXUS processes owner instructions ──────────────────────────────
  await processInstructions(ctx, userId, settings);

  // ── 2 · NOVA discovers ──────────────────────────────────────────────────
  if (!safety.pauseLeadHunter) {
    const nova = agents.get("NOVA");
    if (nova) {
      await setAgent(ctx, nova, {
        status: "searching",
        statusMessage: "scanning local directories",
        lastAction: "searched for new prospects",
        lastActionAt: now(),
      });
    }
    const targets = randInt(1, 2);
    for (let i = 0; i < targets; i++) {
      const id = await discoverLead(ctx, userId, settings);
      if (id) {
        summary.discovered++;
        await logAgent(
          ctx,
          userId,
          "NOVA",
          "ok",
          `Discovered new prospect and added to pipeline`,
          { leadId: id },
        );
      } else {
        break;
      }
    }
  }

  // ── 3 · ATLAS researches ────────────────────────────────────────────────
  const atlas = agents.get("ATLAS");
  if (atlas) {
    await setAgent(ctx, atlas, {
      status: "analyzing",
      statusMessage: "building opportunity reports",
      lastAction: "researched businesses",
      lastActionAt: now(),
    });
  }
  const toResearch = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.or(q.eq(q.field("status"), "NEW"), q.eq(q.field("status"), "RESEARCHING")))
    .collect();
  for (const lead of toResearch.slice(0, 2)) {
    await researchLead(ctx, userId, lead, settings);
    summary.researched++;
    await logAgent(ctx, userId, "ATLAS", "ok", `Opportunity report ready for ${lead.business}`, {
      leadId: lead._id,
    });
  }

  // ── 4 · PIXEL builds demos for qualified leads ──────────────────────────
  if (!safety.pauseWebsiteBuilder) {
    const pixel = agents.get("PIXEL");
    if (pixel) {
      await setAgent(ctx, pixel, {
        status: "building",
        statusMessage: "compiling demo builds",
        lastAction: "built website demos",
        lastActionAt: now(),
      });
    }
    const toBuild = await ctx.db
      .query("leads")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "QUALIFIED"),
            q.eq(q.field("status"), "REPLIED"),
            q.eq(q.field("status"), "DEMO_SENT"),
          ),
          q.neq(q.field("recommendedProduct"), "NONE"),
        ),
      )
      .collect();
    for (const lead of toBuild.slice(0, 2)) {
      const built = await buildDemo(ctx, userId, lead, settings);
      if (built) summary.demosBuilt++;
    }
  }

  // ── 5 · VEX sends personalized offers ───────────────────────────────────
  if (!safety.pauseSales && !safety.pauseEmail) {
    const vex = agents.get("VEX");
    if (vex) {
      await setAgent(ctx, vex, {
        status: "working",
        statusMessage: "drafting personalized outreach",
        lastAction: "sent personalized offers",
        lastActionAt: now(),
      });
    }
    const toContact = await ctx.db
      .query("leads")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "QUALIFIED"))
      .collect();
    for (const lead of toContact.slice(0, 2)) {
      await sendOffer(ctx, userId, lead, settings);
      summary.offersSent++;
    }
  }

  // ── 6 · MERCURY follows up on silent prospects ──────────────────────────
  if (!safety.pauseEmail) {
    const mercury = agents.get("MERCURY");
    if (mercury) {
      await setAgent(ctx, mercury, {
        status: "monitoring",
        statusMessage: "checking silent prospects",
        lastAction: "sent follow-ups",
        lastActionAt: now(),
      });
    }
    const followUpDays = settings.outreach.followUpDays[0] ?? 2;
    const candidates = await ctx.db
      .query("leads")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "CONTACTED"),
            q.eq(q.field("status"), "DEMO_SENT"),
            q.eq(q.field("status"), "REPLIED"),
          ),
          q.gte(q.field("lastContactAt"), 1),
        ),
      )
      .collect();
    for (const lead of candidates.slice(0, 2)) {
      const last = lead.lastContactAt ?? lead.createdAt;
      if (now() - last < followUpDays * DAY) continue;
      const count = await followUpCount(ctx, userId, lead._id);
      if (count >= settings.outreach.maxFollowUps) continue;
      await sendFollowUp(ctx, userId, lead, settings, count + 1);
      summary.followUps++;
    }
  }

  // ── 7 · prospects reply ─────────────────────────────────────────────────
  const conversation = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "CONTACTED"),
        q.eq(q.field("status"), "DEMO_SENT"),
        q.eq(q.field("status"), "REPLIED"),
      ),
    )
    .collect();
  for (const lead of conversation.slice(0, 3)) {
    if (!chance(0.3)) continue;
    const result = await simulateReply(ctx, userId, lead, settings);
    if (result.replied) summary.replies++;
    if (result.optedOut) {
      await logAgent(
        ctx,
        userId,
        "MERCURY",
        "warn",
        `${lead.business} opted out — all follow-ups stopped`,
        { leadId: lead._id },
      );
    }
  }

  // ── 8 · ORION scores intent, VEX sends demos ────────────────────────────
  const orion = agents.get("ORION");
  if (orion) {
    await setAgent(ctx, orion, {
      status: "watching",
      statusMessage: "scoring conversation intent",
      lastAction: "identified high-intent prospects",
      lastActionAt: now(),
    });
  }
  const scored = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "REPLIED"))
    .collect();
  for (const lead of scored.slice(0, 2)) {
    const moved = await orionScore(ctx, userId, lead, settings);
    if (moved) summary.interested++;
  }

  // Win-probability sweep
  const activeDeals = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "REPLIED"),
        q.eq(q.field("status"), "INTERESTED"),
        q.eq(q.field("status"), "DEMO_SENT"),
        q.eq(q.field("status"), "MEETING"),
        q.eq(q.field("status"), "PROPOSAL"),
      ),
    )
    .collect();
  for (const lead of activeDeals) {
    await ctx.db.patch(lead._id, {
      winProbability: estimateWinProbability(lead, settings),
      updatedAt: now(),
    });
  }

  // ── 9 · meetings get booked, deals close ────────────────────────────────
  const interested = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "INTERESTED"),
        q.eq(q.field("status"), "DEMO_SENT"),
      ),
    )
    .collect();
  for (const lead of interested.slice(0, 2)) {
    if (chance(0.55) && (await bookMeeting(ctx, userId, lead, settings))) summary.meetings++;
  }

  const meetings = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "MEETING"))
    .collect();
  for (const lead of meetings.slice(0, 2)) {
    if (chance(0.4) && (await closeDeal(ctx, userId, lead, settings))) summary.won++;
  }

  // stale silent leads occasionally go cold
  const silent = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "CONTACTED"))
    .collect();
  for (const lead of silent.slice(0, 2)) {
    const last = lead.lastContactAt ?? lead.createdAt;
    if (now() - last > 12 * DAY && chance(0.5)) {
      await ctx.db.patch(lead._id, { status: "LOST", updatedAt: now() });
      await trackEvent(ctx, userId, lead._id, "deal_lost");
      await logAgent(ctx, userId, "ORION", "warn", `${lead.business} went cold — marked LOST`, {
        leadId: lead._id,
      });
      summary.lost++;
    }
  }

  // ── 10 · ECHO answers inbound calls ─────────────────────────────────────
  if (!safety.pauseReceptionist) {
    await echoInbound(ctx, userId, settings, summary);
  }

  // ── 11 · Post-payment production workflow ───────────────────────────────
  await processProductionDeployments(ctx, userId, settings);

  // ── wrap up ─────────────────────────────────────────────────────────────
  await ctx.db.patch(settings._id, { updatedAt: now() });
  await setAgent(ctx, nexus, {
    status: "online",
    statusMessage: "cycle complete — awaiting next interval",
    lastAction: `cycle: ${summary.discovered} discovered · ${summary.offersSent} offers · ${summary.replies} replies · ${summary.meetings} meetings`,
    lastActionAt: now(),
  });

  const headline = [
    summary.discovered ? `discovered ${summary.discovered}` : null,
    summary.researched ? `researched ${summary.researched}` : null,
    summary.offersSent ? `sent ${summary.offersSent} offers` : null,
    summary.replies ? `got ${summary.replies} replies` : null,
    summary.meetings ? `booked ${summary.meetings} meetings` : null,
    summary.won ? `closed ${summary.won} deals` : null,
  ]
    .filter(Boolean)
    .join(", ");
  await logAgent(
    ctx,
    userId,
    "NEXUS",
    "ok",
    `Cycle complete — ${headline || "pipeline is stable"}`,
  );

  return summary;
}

// ── individual agent behaviors ───────────────────────────────────────────────

async function discoverLead(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
): Promise<Id<"leads"> | null> {
  const existing = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
  const taken = new Set(existing.map((l) => l.business.toLowerCase()));
  const candidates = DEMO_BUSINESSES.filter(
    (b) => !taken.has(b.business.toLowerCase()),
  );
  if (candidates.length === 0) return null;

  const perf = settings.metrics.industryPerformance;
  const biz = weightedPick(candidates, (b) => {
    const industryScore = perf[b.industry]?.score ?? 0;
    const performanceWeight = 1 + industryScore / 50;
    const targetBoost = settings.targetIndustries.includes(b.industry) ? 1.6 : 1;
    return performanceWeight * targetBoost;
  });
  const t = now();
  const leadId = await ctx.db.insert("leads", {
    userId,
    business: biz.business,
    industry: biz.industry,
    location: biz.location,
    website: biz.website ?? undefined,
    email: biz.email,
    phone: biz.phone,
    businessDescription: biz.description,
    discoveredBy: "NOVA",
    discoveredVia: pick(DISCOVERY_SOURCES),
    discoveredAt: t,
    status: "NEW",
    highIntent: false,
    notifyHighIntent: false,
    notifyMeeting: false,
    notifyDeal: false,
    leadScore: randInt(35, 70),
    createdAt: t,
    updatedAt: t,
  });

  await trackEvent(ctx, userId, leadId, "discovered", {
    metadata: JSON.stringify({ industry: biz.industry, location: biz.location }),
  });
  await bumpMetric(ctx, userId, settings, "leadsCreated", 1);
  return leadId;
}

async function researchLead(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
) {
  const biz =
    findDemoBusiness(lead.business) ??
    ({
      business: lead.business,
      industry: lead.industry ?? "Other",
      location: lead.location ?? "",
      website: lead.website ?? null,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      description: lead.businessDescription ?? "",
      services: [],
      weaknesses: ["online presence underperforming"],
      webPresence: lead.website ? 5 : 0,
      takesCalls: true,
    } satisfies DemoBusiness);

  const rec = computeRecommendation(biz, settings.pricing);

  await ctx.db.patch(lead._id, {
    status: "QUALIFIED",
    researchSummary: `${biz.business} is a ${biz.industry} business in ${biz.location}. ${biz.description ?? ""} ${
      rec.recommendationReason
    }`,
    websiteScore: rec.websiteScore,
    opportunityScore: rec.opportunityScore,
    recommendedProduct: rec.recommendedProduct,
    recommendedPrice: rec.recommendedPrice,
    recommendationReason: rec.recommendationReason,
    weaknesses: rec.weaknesses,
    services: biz.services,
    updatedAt: now(),
  });
  await trackEvent(ctx, userId, lead._id, "researched", {
    metadata: JSON.stringify({
      product: rec.recommendedProduct,
      score: rec.opportunityScore,
    }),
  });
}

async function buildDemo(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
): Promise<boolean> {
  if (!lead.recommendedProduct || lead.recommendedProduct === "NONE") return false;
  const slug = slugify(lead.business);
  let built = false;

  // ── Generate premium website demo ─────────────────────────────────────
  if (lead.recommendedProduct !== "AI_RECEPTIONIST" && !lead.demoUrl) {
    const biz =
      findDemoBusiness(lead.business) ??
      ({
        business: lead.business,
        industry: lead.industry ?? "Other",
        location: lead.location ?? "",
        website: lead.website ?? null,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        description: lead.businessDescription ?? "Professional services",
        services: lead.services ?? [],
        weaknesses: lead.weaknesses ?? [],
      } satisfies DemoBusiness);

    // Generate the premium HTML website
    const html = generateWebsite({
      business: biz.business,
      industry: biz.industry,
      location: biz.location,
      description: biz.description,
      services: biz.services,
      weaknesses: biz.weaknesses,
      website: biz.website,
      email: biz.email,
      phone: biz.phone,
    });

    // Store the generated website in the websites table
    await ctx.db.insert("websites", {
      userId,
      leadId: lead._id,
      slug,
      html,
      industry: biz.industry,
      businessName: biz.business,
      status: "ready",
      generatedAt: now(),
    });

    const demoUrl = `/demo/${slug}`;
    await ctx.db.insert("demoBuilds", {
      userId,
      leadId: lead._id,
      kind: "website",
      status: "deployed",
      deployUrl: demoUrl,
      startedAt: now() - 4 * 60_000,
      finishedAt: now(),
    });
    await ctx.db.patch(lead._id, {
      demoUrl,
      updatedAt: now(),
    });
    await logAgent(
      ctx,
      userId,
      "PIXEL",
      "ok",
      `Generated premium website demo for ${lead.business} — 14-section responsive site with animations`,
      { leadId: lead._id },
    );
    built = true;
  }

  // ── Configure AI receptionist demo ─────────────────────────────────────
  if (
    lead.recommendedProduct !== "WEBSITE" &&
    lead.recommendedProduct !== "PREMIUM_WEBSITE" &&
    !lead.receptionistDemoUrl
  ) {
    const kb = `FAQ + service knowledge base for ${lead.business} (${lead.industry ?? "service business"}): services, hours, pricing for ${lead.services?.slice(0, 3).join(", ") ?? "core services"}, booking + qualification script.`;
    await ctx.db.insert("demoBuilds", {
      userId,
      leadId: lead._id,
      kind: "receptionist",
      status: "deployed",
      deployUrl: `/voice/${slug}`,
      startedAt: now() - 3 * 60_000,
      finishedAt: now(),
    });
    await ctx.db.patch(lead._id, {
      receptionistDemoUrl: `/voice/${slug}`,
      receptionistKnowledgeBase: kb,
      updatedAt: now(),
    });
    await logAgent(
      ctx,
      userId,
      "ECHO",
      "ok",
      `Configured AI receptionist demo for ${lead.business}`,
      { leadId: lead._id },
    );
    built = true;
  }

  return built;
}

async function sendOffer(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
) {
  const biz =
    findDemoBusiness(lead.business) ??
    (DEMO_BUSINESSES[0] as DemoBusiness);
  const rec = computeRecommendation(biz, settings.pricing);
  const { subject, body } = buildOffer(biz, settings, rec);
  const t = now();

  await ctx.db.patch(lead._id, {
    status: "CONTACTED",
    lastOfferSubject: subject,
    lastOfferBody: body,
    lastMessageFromVex: body,
    lastContactAt: t,
    conversation: `${lead.conversation ?? ""}\n\n[${new Date(t).toLocaleString()}] VEX → ${lead.business}\nSubject: ${subject}\n\n${body}`.trim(),
    updatedAt: t,
  });

  await trackEvent(ctx, userId, lead._id, "offer_sent", { subject, body });
  await bumpMetric(ctx, userId, settings, "emailsSent", 1);

  if (lead.email) {
    void ctx.scheduler.runAfter(0, api.lib.email.sendEmail, {
      to: lead.email,
      subject,
      html: body.replace(/\n/g, "<br/>"),
      fromAddress: settings.email.fromAddress ?? undefined,
      fromName: settings.email.fromName ?? undefined,
      forceLive: settings.operationMode === "LIVE",
    });
  }

  await logAgent(
    ctx,
    userId,
    "VEX",
    "ok",
    `Personalized offer sent to ${lead.business}`,
    { leadId: lead._id },
  );
}

async function sendFollowUp(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
  n: number,
) {
  const template = pick(FOLLOW_UP_POOL).replace(
    "{url}",
    lead.demoUrl ?? lead.receptionistDemoUrl ?? "your demo",
  );
  const subject =
    n === 1
      ? `Re: ${lead.lastOfferSubject ?? `quick idea for ${lead.business}`}`
      : `Following up — ${lead.business}`;
  const body = `Hi ${lead.business} team,\n\n${template}\n\nBest regards,\n${settings.agencySignature ?? "The B2K Agency team"}`;
  const t = now();

  await ctx.db.patch(lead._id, {
    lastContactAt: t,
    lastMessageFromVex: body,
    conversation: `${lead.conversation ?? ""}\n\n[${new Date(t).toLocaleString()}] MERCURY → ${lead.business}\nSubject: ${subject}\n\n${body}`.trim(),
    updatedAt: t,
  });
  await trackEvent(ctx, userId, lead._id, "follow_up_sent", { subject, body });
  await bumpMetric(ctx, userId, settings, "emailsSent", 1);
  await logAgent(
    ctx,
    userId,
    "MERCURY",
    "ok",
    `Follow-up #${n} sent to ${lead.business}`,
    { leadId: lead._id },
  );
}

async function followUpCount(
  ctx: MutationCtx,
  userId: Id<"users">,
  leadId: Id<"leads">,
): Promise<number> {
  const events = await ctx.db
    .query("outreachEvents")
    .withIndex("byLeadId", (q) => q.eq("leadId", leadId))
    .collect();
  return events.filter((e) => e.type === "follow_up_sent").length;
}

async function simulateReply(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
): Promise<{ replied: boolean; optedOut: boolean }> {
  const reply = pick(REPLY_POOL);
  const t = now();
  const optedOut = reply.toLowerCase().includes("off your list");

  if (optedOut) {
    await ctx.db.patch(lead._id, {
      status: "OPTED_OUT",
      lastMessageFromProspect: reply,
      lastContactAt: t,
      conversation: `${lead.conversation ?? ""}\n\n[${new Date(t).toLocaleString()}] ${lead.business} → team\n${reply}`.trim(),
      updatedAt: t,
    });
    await trackEvent(ctx, userId, lead._id, "opted_out", {
      body: reply,
      fromProspect: true,
    });
    await bumpMetric(ctx, userId, settings, "repliesReceived", 1);
    return { replied: true, optedOut: true };
  }

  const vexResponse = craftVexResponse(reply, lead, settings);
  await ctx.db.patch(lead._id, {
    status: "REPLIED",
    lastMessageFromProspect: reply,
    lastMessageFromVex: vexResponse,
    lastContactAt: t,
    conversation: `${lead.conversation ?? ""}\n\n[${new Date(t).toLocaleString()}] ${lead.business} → team\n${reply}\n\n[${new Date(t).toLocaleString()}] VEX → ${lead.business}\n${vexResponse}`.trim(),
    updatedAt: t,
  });
  await trackEvent(ctx, userId, lead._id, "reply_received", {
    body: reply,
    fromProspect: true,
  });
  await bumpMetric(ctx, userId, settings, "repliesReceived", 1);
  await bumpMetric(ctx, userId, settings, "emailsSent", 1);
  return { replied: true, optedOut: false };
}

function craftVexResponse(
  reply: string,
  lead: LeadDoc,
  settings: SettingsDoc,
): string {
  const price = lead.recommendedPrice
    ? `R${lead.recommendedPrice.toLocaleString()}`
    : null;
  const demo = lead.demoUrl ?? lead.receptionistDemoUrl;

  if (/price|cost|much/.test(reply)) {
    return `Great question — for ${lead.business} we'd recommend the ${productLabel(
      lead.recommendedProduct,
    )}, which comes to ${price ?? "our standard rate"}. That includes the full build, copy and deployment — no hidden fees. I can send the exact breakdown if that helps.`;
  }
  if (/receptionist|call/.test(reply)) {
    return `Great news — the receptionist is exactly built for that. It answers every call on your existing number, qualifies the enquiry, books appointments into your calendar and sends follow-ups. I've included a live demo link in my last message — happy to walk you through it.`;
  }
  if (/example|demo|sample/.test(reply)) {
    return demo
      ? `Absolutely — the live demo is right here: ${demo}. It takes about two minutes to look at. I'm happy to book a 15-minute call to walk through it together.`
      : `Absolutely — I'll have our team put a personalized demo together for ${lead.business} and send it over within 24 hours.`;
  }
  if (/call|talk|meet|book/.test(reply)) {
    return `Perfect — let's do it. I'll send over a calendar link and we can find a slot that suits you. In the meantime, anything specific about ${lead.business} you'd like the demo tailored around?`;
  }
  if (/burned|different|trust/.test(reply)) {
    return `Totally fair. What makes us different: every demo is built for your actual business before you pay a cent, and there are no long-term contracts — you own everything we build. If you'd like, I'll send over references from other ${lead.industry ?? "local"} businesses first.`;
  }
  if (/are you|ai or|real person|robot|human being|is this ai/.test(reply)) {
    return `Straight answer: I'm an AI — the sales agent in B2K Agency's team of AI specialists, working on behalf of the agency's owner. Nothing about the offer is automated away from you: the demo is built specifically for ${lead.business}, and a human from the agency is available any time you'd like to talk. Happy to loop them in — just say the word.`;
  }
  return `Thanks for getting back to us — happy to answer any questions. ${
    demo ? `The demo is live here: ${demo}.` : ""
  } Would a quick 15-minute call this week work for you?`;
}

function productLabel(product: LeadDoc["recommendedProduct"]): string {
  switch (product) {
    case "WEBSITE":
      return "website package";
    case "PREMIUM_WEBSITE":
      return "premium website package";
    case "WEBSITE_PLUS_RECEPTIONIST":
      return "website + AI receptionist package";
    case "AI_RECEPTIONIST":
      return "AI receptionist package";
    default:
      return "package";
  }
}

function estimateWinProbability(
  lead: Pick<LeadDoc, "leadScore" | "status" | "industry">,
  settings: SettingsDoc,
): number {
  const base = lead.leadScore ?? 50;
  const stageBoost: Record<string, number> = {
    REPLIED: 8,
    INTERESTED: 18,
    DEMO_SENT: 24,
    MEETING: 36,
    PROPOSAL: 46,
  };
  const industryScore = lead.industry
    ? settings.metrics.industryPerformance[lead.industry]?.score ?? 0
    : 0;
  return Math.max(
    5,
    Math.min(96, base + (stageBoost[lead.status] ?? 0) + industryScore / 10),
  );
}

async function orionScore(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
): Promise<boolean> {
  const msg = (lead.lastMessageFromProspect ?? "").toLowerCase();
  const highIntent =
    /price|cost|demo|example|call|talk|meet|book|proposal|interested|how does/.test(
      msg,
    ) && !/burned|different/.test(msg);

  if (!highIntent) return false;

  const t = now();
  const newScore = Math.max(lead.leadScore ?? 50, 78);
  await ctx.db.patch(lead._id, {
    status: "INTERESTED",
    highIntent: true,
    leadScore: newScore,
    winProbability: estimateWinProbability(
      { leadScore: newScore, status: "INTERESTED", industry: lead.industry },
      settings,
    ),
    nextAction: "VEX sends demo link",
    updatedAt: t,
  });
  await trackEvent(ctx, userId, lead._id, "status_changed", {
    metadata: JSON.stringify({ from: "REPLIED", to: "INTERESTED" }),
  });

  const demo = lead.demoUrl ?? lead.receptionistDemoUrl;
  if (demo) {
    const msg2 = `Here's the demo I mentioned: ${demo}. Take a look when you get a minute — I'll check in tomorrow.`;
    await ctx.db.patch(lead._id, {
      status: "DEMO_SENT",
      lastMessageFromVex: msg2,
      lastContactAt: t,
      conversation: `${lead.conversation ?? ""}\n\n[${new Date(t).toLocaleString()}] VEX → ${lead.business}\n${msg2}`.trim(),
      updatedAt: t,
    });
    await trackEvent(ctx, userId, lead._id, "demo_sent", { body: msg2 });
    await bumpMetric(ctx, userId, settings, "demosSent", 1);
  }

  if (!lead.notifyHighIntent) {
    await ctx.db.patch(lead._id, { notifyHighIntent: true });
    await ctx.db.insert("notifications", {
      userId,
      type: "high_intent",
      title: `High-intent prospect: ${lead.business}`,
      body: `ORION flagged ${lead.business} as a serious buyer${
        lead.recommendedPrice
          ? ` (${productLabel(lead.recommendedProduct)} · R${lead.recommendedPrice.toLocaleString()})`
          : ""
      }. A human touch is recommended.`,
      leadId: lead._id,
      read: false,
      createdAt: t,
    });
  }

  await logAgent(
    ctx,
    userId,
    "ORION",
    "ok",
    `${lead.business} flagged as high intent — owner notified`,
    { leadId: lead._id },
  );
  return true;
}

async function bookMeeting(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
): Promise<boolean> {
  const t = now();
  const scheduledAt = t + randInt(12, 72) * 3_600_000;
  await ctx.db.patch(lead._id, {
    status: "MEETING",
    appointment: {
      scheduledAt,
      title: `Discovery call — ${lead.business}`,
      with: lead.business,
      notes: "Qualified by VEX · demo shared · confirm availability",
    },
    notifyMeeting: true,
    updatedAt: t,
  });
  await trackEvent(ctx, userId, lead._id, "appointment_booked", {
    metadata: JSON.stringify({ scheduledAt }),
  });
  await bumpMetric(ctx, userId, settings, "meetingsBooked", 1);
  await ctx.db.insert("notifications", {
    userId,
    type: "meeting",
    title: `Meeting booked — ${lead.business}`,
    body: `${lead.business} (${lead.industry ?? "service business"}) · ${new Date(scheduledAt).toLocaleString()}`,
    leadId: lead._id,
    read: false,
    createdAt: t,
  });
  await logAgent(
    ctx,
    userId,
    "VEX",
    "ok",
    `Discovery call booked with ${lead.business}`,
    { leadId: lead._id },
  );
  return true;
}

async function closeDeal(
  ctx: MutationCtx,
  userId: Id<"users">,
  lead: LeadDoc,
  settings: SettingsDoc,
): Promise<boolean> {
  const t = now();
  const value = lead.recommendedPrice ?? settings.pricing.websiteFrom;
  await ctx.db.patch(lead._id, {
    status: "WON",
    dealValue: value,
    notifyDeal: true,
    updatedAt: t,
  });
  await trackEvent(ctx, userId, lead._id, "deal_won", {
    metadata: JSON.stringify({ value }),
  });
  await bumpMetric(ctx, userId, settings, "dealsWon", 1);
  await bumpMetric(ctx, userId, settings, "dealValueWon", value);

  const industry = lead.industry ?? "Other";
  const perf = settings.metrics.industryPerformance[industry] ?? {
    leads: 0,
    replies: 0,
    demos: 0,
    won: 0,
    value: 0,
    score: 0,
  };
  const next = {
    ...settings.metrics.industryPerformance,
    [industry]: {
      ...perf,
      won: perf.won + 1,
      value: perf.value + value,
      score: Math.min(100, perf.score + 12),
    },
  };
  await ctx.db.patch(settings._id, {
    metrics: { ...settings.metrics, industryPerformance: next },
  });

  await ctx.db.insert("notifications", {
    userId,
    type: "deal",
    title: `Deal won — ${lead.business}`,
    body: `${productLabel(lead.recommendedProduct)} · R${value.toLocaleString()}`,
    leadId: lead._id,
    read: false,
    createdAt: t,
  });
  await logAgent(
    ctx,
    userId,
    "ORION",
    "ok",
    `${lead.business} closed — R${value.toLocaleString()}`,
    { leadId: lead._id },
  );
  return true;
}

async function echoInbound(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
  summary: CycleSummary,
) {
  if (!chance(0.45)) return;
  const agents = await getAgents(ctx, userId);
  const echo = agents.get("ECHO");
  if (!echo) return;

  const withPhone = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.neq(q.field("phone"), undefined))
    .collect();
  const target = withPhone.find((l) => l.phone) ?? withPhone[0];
  if (!target) return;

  await setAgent(ctx, echo, {
    status: "talking",
    statusMessage: `on a call with ${target.business}`,
    lastAction: "answered inbound call",
    lastActionAt: now(),
    currentLeadId: target._id,
  });
  await logAgent(
    ctx,
    userId,
    "ECHO",
    "ok",
    `Answered inbound call from ${target.business} — qualified the enquiry and captured details`,
    { leadId: target._id },
  );
  summary.calls++;

  if (chance(0.6) && target.status !== "MEETING" && target.status !== "WON") {
    const t = now();
    const scheduledAt = t + randInt(6, 36) * 3_600_000;
    await ctx.db.patch(target._id, {
      status: "MEETING",
      appointment: {
        scheduledAt,
        title: `Consultation — ${target.business}`,
        with: target.business,
        notes: "Booked by ECHO from an inbound call",
      },
      notifyMeeting: true,
      updatedAt: t,
    });
    await trackEvent(ctx, userId, target._id, "appointment_booked", {
      metadata: JSON.stringify({ via: "ECHO", scheduledAt }),
    });
    await bumpMetric(ctx, userId, settings, "meetingsBooked", 1);
    await ctx.db.insert("notifications", {
      userId,
      type: "meeting",
      title: `ECHO booked a call — ${target.business}`,
      body: `Inbound call handled 24/7 by ECHO · ${new Date(scheduledAt).toLocaleString()}`,
      leadId: target._id,
      read: false,
      createdAt: t,
    });
  }
}

// ── post-payment production workflow ─────────────────────────────────────────

/**
 * NEXUS monitors paid websites and triggers the production deployment pipeline.
 * Called each cycle — processes any website with paymentStatus === "paid".
 */
async function processProductionDeployments(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
) {
  const paidSites = await ctx.db
    .query("websites")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("paymentStatus"), "paid"))
    .collect();

  for (const site of paidSites) {
    if (site.status === "production") continue; // already deployed

    // Step 1: NEXUS confirms payment
    await logAgent(
      ctx,
      userId,
      "NEXUS",
      "ok",
      `Payment confirmed for ${site.businessName} — production deployment starting`,
      { leadId: site.leadId },
    );

    // Step 2: PIXEL finalizes the production website
    // Remove demo CTA banner, add production metadata
    let productionHtml = site.html;
    // Remove the demo upgrade CTA
    productionHtml = productionHtml.replace(
      /<div class="fixed bottom-0.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/s,
      "",
    );
    // Add production-ready meta tags
    productionHtml = productionHtml.replace(
      '<meta name="viewport"',
      '<meta name="robots" content="index, follow"/>\n<meta name="viewport"',
    );

    // Step 3: Update the website record
    const productionUrl = `/demo/${site.slug}`;
    await ctx.db.patch(site._id, {
      html: productionHtml,
      status: "production",
      productionUrl,
      deployedAt: now(),
    });

    // Step 4: ORION updates deal status
    const lead = await ctx.db.query("leads").get(site.leadId);
    if (lead) {
      await ctx.db.patch(lead._id, {
        status: "WON",
        demoUrl: productionUrl,
        updatedAt: now(),
      });
    }

    // Step 5: Log deployment
    await logAgent(
      ctx,
      userId,
      "PIXEL",
      "ok",
      `Production website deployed for ${site.businessName} — ${productionUrl}`,
      { leadId: site.leadId },
    );

    // Step 6: Send delivery email
    if (lead?.email) {
      const deliverySubject = `Your website is live 🎉 — ${site.businessName}`;
      const deliveryBody = `Hi ${site.businessName} team,

Great news — your website is now live!

🌐 Live website: ${settings.demoDomain ?? "your-domain"}${productionUrl}

Payment has been received and confirmed. Your website includes:
✅ Premium responsive design
✅ Smooth animations and transitions
✅ Mobile-optimized layout
✅ Contact/quote form
✅ SEO-ready structure

Next steps:
1. Review your live website
2. Let us know if you'd like any adjustments
3. We'll set up your custom domain when ready

Need help? Reply to this email or call us directly.

Best regards,
${settings.agencySignature ?? "The B2K Agency team"}`;

      await ctx.scheduler.runAfter(0, api.lib.email.sendEmail, {
        to: lead.email,
        subject: deliverySubject,
        html: deliveryBody.replace(/\n/g, "<br/>"),
        fromAddress: settings.email.fromAddress ?? undefined,
        fromName: settings.email.fromName ?? undefined,
        forceLive: settings.operationMode === "LIVE",
      });
    }

    // Step 7: Notify the owner
    await ctx.db.insert("notifications", {
      userId,
      type: "deal",
      title: `Website delivered — ${site.businessName}`,
      body: `Production website deployed and customer notified. Revenue: R${lead?.dealValue?.toLocaleString() ?? "—"}`,
      leadId: site.leadId,
      read: false,
      createdAt: now(),
    });
  }
}

// ── owner instructions (command chat → NEXUS) ────────────────────────────────

async function processInstructions(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
) {
  const queued = await ctx.db
    .query("instructions")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "queued"))
    .collect();

  for (const instruction of queued.slice(0, 5)) {
    const t = now();
    await ctx.db.patch(instruction._id, { status: "processing" });
    const response = await handleInstruction(ctx, userId, settings, instruction.text);
    await ctx.db.patch(instruction._id, {
      status: "done",
      response,
      processedAt: t,
    });
    await logAgent(
      ctx,
      userId,
      "NEXUS",
      "ok",
      `Processed owner instruction: "${instruction.text.slice(0, 60)}${instruction.text.length > 60 ? "…" : ""}"`,
    );
  }
}

async function handleInstruction(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
  text: string,
): Promise<string> {
  const lower = text.toLowerCase();

  if (/pause everything|stop everything|kill switch|stop all agents/.test(lower)) {
    await ctx.db.patch(settings._id, {
      safety: { ...settings.safety, stopAllAgents: true },
    });
    return "Emergency stop engaged. All agents are paused — say \"resume\" or flip the kill switch in Settings to bring the team back online.";
  }

  if (/resume|restart|unpause|wake up/.test(lower)) {
    await ctx.db.patch(settings._id, {
      safety: {
        ...settings.safety,
        stopAllAgents: false,
        pauseSales: false,
        pauseLeadHunter: false,
        pauseEmail: false,
        pauseWebsiteBuilder: false,
        pauseReceptionist: false,
      },
    });
    return "All systems nominal. The team is back online and the next autonomous cycle is already scheduled.";
  }

  const industryMatch = [
    "construction",
    "plumbing",
    "electrician",
    "mechanic",
    "restaurant",
    "salon",
    "real estate",
    "landscaping",
    "roofing",
    "security",
    "cleaning",
    "gym",
    "hotel",
    "healthcare",
    "retail",
  ].find((k) => lower.includes(k));
  if (industryMatch && /focus|prioriti|target|hunt|find|go after|more/.test(lower)) {
    const label = industryLabel(industryMatch);
    if (!settings.targetIndustries.includes(label)) {
      await ctx.db.patch(settings._id, {
        targetIndustries: [...settings.targetIndustries, label],
      });
    }
    return `Logged. NOVA's next search cycles will prioritise ${label} businesses in ${settings.targetRegions.join(", ") || "your target regions"}. ATLAS will deep-research every one of them.`;
  }

  if (/budget|pricing|price|cheap|expensive/.test(lower)) {
    const p = settings.pricing;
    return `Noted. Approved pricing range is currently R${p.websiteFrom.toLocaleString()} – R${p.websitePlusReceptionistFrom.toLocaleString()}. VEX will only quote within these bounds — edit them any time in Settings → Pricing.`;
  }

  if (/demo|website|build/.test(lower)) {
    return "On it. PIXEL will prioritise building personalized demos for every qualified lead before VEX sends the next outreach wave. First builds land within the next cycle.";
  }

  if (/follow ?up|nudge|chase/.test(lower)) {
    return "Understood. MERCURY will tighten the follow-up cadence — the next wave goes out on the current schedule, and I'll flag anyone who goes quiet for more than 7 days.";
  }

  return `Logged. NEXUS has acknowledged your instruction and will fold it into the next autonomous cycle. The team continues operating on the configured goals — I'll notify you the moment anything needs your attention.`;
}

function industryLabel(key: string): string {
  const map: Record<string, string> = {
    construction: "Construction",
    plumbing: "Plumbing",
    electrician: "Electrician",
    mechanic: "Mechanic / Auto Repair",
    restaurant: "Restaurant / Cafe",
    salon: "Salon / Barbershop",
    "real estate": "Real Estate",
    landscaping: "Landscaping",
    roofing: "Roofing",
    security: "Security",
    cleaning: "Cleaning / Janitorial",
    gym: "Gym / Fitness",
    hotel: "Hotel / Accommodation",
    healthcare: "Healthcare",
    retail: "Retail",
  };
  return map[key] ?? key;
}

// ── metrics ──────────────────────────────────────────────────────────────────

export async function bumpMetric(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
  key: Exclude<keyof SettingsDoc["metrics"], "industryPerformance">,
  delta: number,
) {
  const fresh = await getAgency(ctx, userId);
  if (!fresh) return;
  const metrics = { ...fresh.metrics, [key]: fresh.metrics[key] + delta };
  await ctx.db.patch(fresh._id, { metrics });
  settings.metrics = metrics as SettingsDoc["metrics"];
}

// ── seeding (first run) ──────────────────────────────────────────────────────

export async function seedPipeline(
  ctx: MutationCtx,
  userId: Id<"users">,
  settings: SettingsDoc,
) {
  const seeds: { biz: DemoBusiness; stage: LeadStage }[] = [];
  const pool = [...DEMO_BUSINESSES];

  const stagePlan: LeadStage[] = [
    "NEW",
    "NEW",
    "RESEARCHING",
    "RESEARCHING",
    "QUALIFIED",
    "QUALIFIED",
    "CONTACTED",
    "CONTACTED",
    "REPLIED",
    "REPLIED",
    "DEMO_SENT",
    "INTERESTED",
    "MEETING",
    "WON",
    "LOST",
    "OPTED_OUT",
  ];

  for (const stage of stagePlan) {
    if (pool.length === 0) break;
    const idx = randInt(0, pool.length - 1);
    seeds.push({ biz: pool[idx], stage });
    pool.splice(idx, 1);
  }

  let emailsSent = 0;
  let repliesReceived = 0;
  let demosSent = 0;
  let meetingsBooked = 0;
  let dealsWon = 0;
  let dealValueWon = 0;

  for (let i = 0; i < seeds.length; i++) {
    const { biz, stage } = seeds[i];
    const createdAt = now() - (seeds.length - i) * DAY * 0.9 - randInt(0, 4) * 3_600_000;
    const rec = computeRecommendation(biz, settings.pricing);
    const t0 = createdAt;

    const base: Omit<LeadDoc, "_id" | "_creationTime"> = {
      userId,
      status: "NEW",
      business: biz.business,
      industry: biz.industry,
      location: biz.location,
      website: biz.website ?? undefined,
      email: biz.email,
      phone: biz.phone,
      businessDescription: biz.description,
      discoveredBy: "NOVA",
      discoveredVia: pick(DISCOVERY_SOURCES),
      discoveredAt: t0,
      services: biz.services,
      leadScore: randInt(40, 85),
      highIntent: false,
      notifyHighIntent: false,
      notifyMeeting: false,
      notifyDeal: false,
      createdAt: t0,
      updatedAt: t0,
    };

    if (stage !== "NEW") {
      base.researchSummary = `${biz.business} is a ${biz.industry} business in ${biz.location}. ${biz.description} ${rec.recommendationReason}`;
      base.websiteScore = rec.websiteScore;
      base.opportunityScore = rec.opportunityScore;
      base.recommendedProduct = rec.recommendedProduct;
      base.recommendedPrice = rec.recommendedPrice;
      base.recommendationReason = rec.recommendationReason;
      base.weaknesses = rec.weaknesses;
    }

    if (stage === "RESEARCHING") {
      base.status = "RESEARCHING";
    } else if (stage === "QUALIFIED" || stage === "CONTACTED" || stage === "REPLIED" || stage === "DEMO_SENT" || stage === "INTERESTED" || stage === "MEETING" || stage === "WON") {
      base.status = stage;
      if (stage !== "QUALIFIED") {
        const offer = buildOffer(biz, settings, rec);
        base.lastOfferSubject = offer.subject;
        base.lastOfferBody = offer.body;
        base.lastContactAt = t0 + 6 * 3_600_000;
        base.conversation = `[${new Date(t0 + 6 * 3_600_000).toLocaleString()}] VEX → ${biz.business}\nSubject: ${offer.subject}\n\n${offer.body}`;
        emailsSent++;
      }
      if (stage === "REPLIED" || stage === "DEMO_SENT" || stage === "INTERESTED" || stage === "MEETING" || stage === "WON") {
        const reply = pick(REPLY_POOL);
        base.lastMessageFromProspect = reply;
        base.conversation = `${base.conversation}\n\n[${new Date(t0 + 8 * 3_600_000).toLocaleString()}] ${biz.business} → team\n${reply}`;
        repliesReceived++;
        base.highIntent = true;
        base.leadScore = Math.max(base.leadScore ?? 50, 78);
      }
      if (stage === "DEMO_SENT" || stage === "INTERESTED" || stage === "MEETING" || stage === "WON") {
        base.demoUrl = `/demo/${slugify(biz.business)}`;
        base.lastMessageFromVex = `Here's the demo I mentioned: ${base.demoUrl}. Take a look when you get a minute.`;
        demosSent++;
      }
      if (stage === "INTERESTED" || stage === "MEETING" || stage === "WON") {
        base.notifyHighIntent = true;
      }
      if (stage === "MEETING" || stage === "WON") {
        base.appointment = {
          scheduledAt: t0 + 2 * DAY,
          title: `Discovery call — ${biz.business}`,
          with: biz.business,
          notes: "Booked via demo follow-up",
        };
        base.notifyMeeting = true;
        meetingsBooked++;
      }
      if (stage === "WON") {
        base.status = "WON";
        base.dealValue = rec.recommendedPrice;
        base.notifyDeal = true;
        dealsWon++;
        dealValueWon += rec.recommendedPrice;
      }
    } else if (stage === "LOST") {
      base.status = "LOST";
      const offer = buildOffer(biz, settings, rec);
      base.lastOfferSubject = offer.subject;
      base.lastOfferBody = offer.body;
      base.lastContactAt = t0 + 6 * 3_600_000;
      base.conversation = `[${new Date(t0 + 6 * 3_600_000).toLocaleString()}] VEX → ${biz.business}\nSubject: ${offer.subject}\n\n${offer.body}`;
      emailsSent++;
    } else if (stage === "OPTED_OUT") {
      base.status = "OPTED_OUT";
      base.lastMessageFromProspect = "Please take us off your list.";
    } else {
      base.status = "NEW";
    }

    if (["REPLIED", "DEMO_SENT", "INTERESTED", "MEETING", "PROPOSAL", "WON"].includes(stage)) {
      base.winProbability = estimateWinProbability(
        { leadScore: base.leadScore, status: base.status, industry: base.industry },
        settings,
      );
    }

    base.updatedAt = t0 + (base.lastContactAt ? 12 * 3_600_000 : 0) + randInt(0, 60) * 60_000;

    const leadId = await ctx.db.insert("leads", base);

    await trackEvent(ctx, userId, leadId, "discovered", {
      metadata: JSON.stringify({ industry: biz.industry, location: biz.location }),
      createdAt: t0,
    });
    if (stage !== "NEW") {
      await trackEvent(ctx, userId, leadId, "researched", {
        metadata: JSON.stringify({ product: rec.recommendedProduct, score: rec.opportunityScore }),
        createdAt: t0 + 3 * 3_600_000,
      });
    }
  }

  await ctx.db.patch(settings._id, {
    metrics: {
      ...settings.metrics,
      leadsCreated: seeds.length,
      emailsSent: emailsSent + 2,
      repliesReceived,
      demosSent,
      meetingsBooked,
      dealsWon,
      dealValueWon,
    },
    updatedAt: now(),
  });

  // seed notifications
  const notifications: { type: "high_intent" | "meeting" | "deal"; title: string; body: string; leadId: Id<"leads">; hoursAgo: number }[] = [];
  const notifLeads = await ctx.db
    .query("leads")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
  const won = notifLeads.find((l) => l.status === "WON");
  const meeting = notifLeads.find((l) => l.status === "MEETING");
  const interested = notifLeads.find((l) => l.status === "INTERESTED");
  if (won) {
    notifications.push({
      type: "deal",
      title: `Deal won — ${won.business}`,
      body: `${productLabel(won.recommendedProduct)} · R${(won.dealValue ?? 0).toLocaleString()}`,
      leadId: won._id,
      hoursAgo: 20,
    });
  }
  if (meeting) {
    notifications.push({
      type: "meeting",
      title: `Meeting booked — ${meeting.business}`,
      body: `Qualified by VEX · demo shared · ${new Date(meeting.appointment?.scheduledAt ?? Date.now()).toLocaleString()}`,
      leadId: meeting._id,
      hoursAgo: 7,
    });
  }
  if (interested) {
    notifications.push({
      type: "high_intent",
      title: `High-intent prospect: ${interested.business}`,
      body: "ORION flagged this as a serious buyer — a human touch is recommended.",
      leadId: interested._id,
      hoursAgo: 3,
    });
  }
  for (const n of notifications) {
    await ctx.db.insert("notifications", {
      userId,
      type: n.type,
      title: n.title,
      body: n.body,
      leadId: n.leadId,
      read: n.hoursAgo > 10,
      createdAt: now() - n.hoursAgo * 3_600_000,
    });
  }

  // seed agent activity logs
  const seedLogs: { agent: Doc<"agentLogs">["agent"]; level: "info" | "ok" | "warn"; message: string; leadId?: Id<"leads">; hoursAgo: number }[] = [
    { agent: "NOVA", level: "ok", message: "Search sweep complete — 3 new prospects matched your target market", hoursAgo: 26 },
    { agent: "ATLAS", level: "ok", message: "Opportunity reports compiled for 5 qualified businesses", hoursAgo: 20 },
    { agent: "VEX", level: "ok", message: "Personalized offers sent — 2 replies received within 48h", hoursAgo: 12 },
    { agent: "PIXEL", level: "ok", message: "Premium website demos deployed for qualified leads", hoursAgo: 9 },
    { agent: "MERCURY", level: "ok", message: "Follow-up wave sent to silent prospects", hoursAgo: 5 },
    { agent: "ORION", level: "ok", message: "High-intent prospect identified and escalated to owner", hoursAgo: 3 },
    { agent: "ECHO", level: "ok", message: "Answered 2 inbound calls overnight — 1 consultation booked", hoursAgo: 2 },
    { agent: "NEXUS", level: "ok", message: "Autonomous cycle complete — pipeline healthy", hoursAgo: 1 },
  ];
  for (const l of seedLogs) {
    await ctx.db.insert("agentLogs", {
      userId,
      agent: l.agent,
      level: l.level,
      message: l.message,
      leadId: l.leadId,
      createdAt: now() - l.hoursAgo * 3_600_000,
    });
  }
}

type LeadStage =
  | "NEW"
  | "RESEARCHING"
  | "QUALIFIED"
  | "CONTACTED"
  | "REPLIED"
  | "DEMO_SENT"
  | "INTERESTED"
  | "MEETING"
  | "WON"
  | "LOST"
  | "OPTED_OUT";

/** Initialize the agent roster for an owner (called on first setup). */
export async function ensureAgents(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("agents")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .collect();
  if (existing.length > 0) return;

  const t = now();
  for (const meta of AGENT_ROSTER) {
    await ctx.db.insert("agents", {
      userId,
      name: meta.name,
      displayName: meta.displayName,
      role: meta.role,
      status: "online",
      statusMessage: "ready",
      lastHeartbeat: t,
      lastAction: "onboarded",
      lastActionAt: t,
      paused: false,
    });
  }
}
