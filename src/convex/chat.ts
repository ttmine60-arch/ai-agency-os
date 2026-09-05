import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listInstructions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const instructions = await ctx.db
      .query("instructions")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    return instructions.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Owner command → NEXUS. Instructions are OPTIONAL for the agency to run —
 * they are queued and folded into the next autonomous cycle, so the owner
 * never has to babysit individual tasks.
 */
export const sendInstruction = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Instruction cannot be empty");

    return await ctx.db.insert("instructions", {
      userId,
      author: "owner",
      text: trimmed,
      status: "queued",
      createdAt: Date.now(),
    });
  },
});