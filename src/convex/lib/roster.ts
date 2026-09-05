/**
 * Static metadata for the B2K Agency OS agent roster.
 * Shared by the backend engine (init / orchestrator) and used to
 * render the AI team in the dashboard.
 */

export const ROSTER = [
  {
    name: "NEXUS",
    displayName: "NEXUS",
    role: "AI Director · Orchestrator",
    tagline:
      "Decides what happens next, assigns tasks, monitors the team and escalates what matters.",
    color: "#f59e0b",
  },
  {
    name: "NOVA",
    displayName: "NOVA",
    role: "Lead Hunter",
    tagline:
      "Continuously searches for businesses that need your products — by industry, location and weakness.",
    color: "#10b981",
  },
  {
    name: "ATLAS",
    displayName: "ATLAS",
    role: "Business Researcher",
    tagline:
      "Researches every lead, audits websites, maps the customer experience and writes opportunity reports.",
    color: "#0ea5e9",
  },
  {
    name: "VEX",
    displayName: "VEX",
    role: "Sales Agent",
    tagline:
      "Writes personalized outreach, handles replies and objections, and moves serious buyers forward.",
    color: "#f43f5e",
  },
  {
    name: "PIXEL",
    displayName: "PIXEL",
    role: "Web Architect",
    tagline:
      "Designs, builds and deploys personalized website and receptionist demos for every qualified lead.",
    color: "#8b5cf6",
  },
  {
    name: "ECHO",
    displayName: "ECHO",
    role: "AI Receptionist",
    tagline:
      "Answers inbound calls 24/7, qualifies enquiries and books appointments straight into your pipeline.",
    color: "#06b6d4",
  },
  {
    name: "MERCURY",
    displayName: "MERCURY",
    role: "Follow-Up Agent",
    tagline:
      "Tracks prospects who haven't replied, sends timed follow-ups, and stops the moment someone opts out.",
    color: "#6366f1",
  },
  {
    name: "ORION",
    displayName: "ORION",
    role: "Deal Manager",
    tagline:
      "Scores buying intent from every conversation and flags the deals that need a human in the room.",
    color: "#f97316",
  },
] as const;

export type RosterAgentName = (typeof ROSTER)[number]["name"];

export const AGENT_ROSTER = ROSTER;