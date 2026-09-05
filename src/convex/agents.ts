import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logAgent } from "./lib/sim";

export const listAgents = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const agents = await ctx.db
      .query("agents")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    return agents.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const toggleAgentPause = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== userId) throw new Error("Agent not found");

    const paused = !agent.paused;
    await ctx.db.patch(agentId, {
      paused,
      status: paused ? "paused" : "online",
      statusMessage: paused ? "paused by owner" : "ready",
    });
    await logAgent(
      ctx,
      userId,
      agent.name,
      paused ? "warn" : "ok",
      paused ? `${agent.name} paused by owner` : `${agent.name} resumed by owner`,
    );
    return paused;
  },
});