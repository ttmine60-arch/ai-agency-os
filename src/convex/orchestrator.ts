import { mutation } from "./_generated/server";
import { simulateCycle } from "./lib/sim";

/**
 * The NEXUS orchestration entry point. Runs one full autonomous cycle for
 * every agency in the system:
 *
 *   discover → research → build demos → outreach → replies →
 *   follow-ups → intent scoring → meetings → closes → inbound calls
 *
 * Called by the cron (every few minutes) AND by the "Run cycle" button in
 * the command center — the button is a convenience, never a requirement.
 */
export const runCycle = mutation({
  handler: async (ctx) => {
    const agencies = await ctx.db.query("agencySettings").collect();
    const results: { userId: string; summary: Record<string, number> }[] = [];
    for (const agency of agencies) {
      const summary = await simulateCycle(ctx, agency.userId);
      results.push({ userId: agency.userId, summary: { ...summary } });
    }
    return results;
  },
});