import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listNotifications = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
    return notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
  },
});

export const markAllNotificationsRead = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    for (const n of notifications) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const markNotificationRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const n = await ctx.db.get(id);
    if (n && n.userId === userId) {
      await ctx.db.patch(id, { read: true });
    }
  },
});