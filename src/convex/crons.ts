import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

/**
 * The agency never sleeps: NEXUS runs a full autonomous cycle every
 * 5 minutes so the team keeps discovering, researching, selling and
 * following up without the owner touching anything.
 */
const crons = cronJobs();

crons.interval(
  "nexus-autonomous-cycle",
  { minutes: 5 },
  api.orchestrator.runCycle,
);

export default crons;