import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const listLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const logs = await ctx.db
      .query("agentLogs")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    return logs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit ?? 60);
  },
});