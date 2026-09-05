import {
  BrainCircuit,
  Megaphone,
  Palette,
  PhoneCall,
  Radar,
  RefreshCw,
  Target,
  Telescope,
  type LucideIcon,
} from "lucide-react";

export type AgentStatus =
  | "idle"
  | "working"
  | "searching"
  | "analyzing"
  | "building"
  | "talking"
  | "online"
  | "monitoring"
  | "watching"
  | "error"
  | "paused";

export interface AgentMeta {
  name: string;
  displayName: string;
  role: string;
  tagline: string;
  color: string;
  icon: LucideIcon;
}

export const AGENT_META: Record<string, AgentMeta> = {
  NEXUS: {
    name: "NEXUS",
    displayName: "NEXUS",
    role: "AI Director · Orchestrator",
    tagline:
      "Decides what happens next, assigns tasks, monitors the team and escalates what matters.",
    color: "#f59e0b",
    icon: BrainCircuit,
  },
  NOVA: {
    name: "NOVA",
    displayName: "NOVA",
    role: "Lead Hunter",
    tagline:
      "Continuously searches for businesses that need your products — by industry, location and weakness.",
    color: "#10b981",
    icon: Radar,
  },
  ATLAS: {
    name: "ATLAS",
    displayName: "ATLAS",
    role: "Business Researcher",
    tagline:
      "Researches every lead, audits websites, maps the customer experience and writes opportunity reports.",
    color: "#0ea5e9",
    icon: Telescope,
  },
  VEX: {
    name: "VEX",
    displayName: "VEX",
    role: "Sales Agent",
    tagline:
      "Writes personalized outreach, handles replies and objections, and moves serious buyers forward.",
    color: "#f43f5e",
    icon: Megaphone,
  },
  PIXEL: {
    name: "PIXEL",
    displayName: "PIXEL",
    role: "Web Architect",
    tagline:
      "Designs, builds and deploys personalized website and receptionist demos for every qualified lead.",
    color: "#8b5cf6",
    icon: Palette,
  },
  ECHO: {
    name: "ECHO",
    displayName: "ECHO",
    role: "AI Receptionist",
    tagline:
      "Answers inbound calls 24/7, qualifies enquiries and books appointments straight into your pipeline.",
    color: "#06b6d4",
    icon: PhoneCall,
  },
  MERCURY: {
    name: "MERCURY",
    displayName: "MERCURY",
    role: "Follow-Up Agent",
    tagline:
      "Tracks prospects who haven't replied, sends timed follow-ups, and stops the moment someone opts out.",
    color: "#6366f1",
    icon: RefreshCw,
  },
  ORION: {
    name: "ORION",
    displayName: "ORION",
    role: "Deal Manager",
    tagline:
      "Scores buying intent from every conversation and flags the deals that need a human in the room.",
    color: "#f97316",
    icon: Target,
  },
};

export const AGENT_ORDER = [
  "NEXUS",
  "NOVA",
  "ATLAS",
  "VEX",
  "PIXEL",
  "ECHO",
  "MERCURY",
  "ORION",
];

export function statusStyle(status: AgentStatus): {
  dot: string;
  label: string;
  text: string;
} {
  switch (status) {
    case "online":
      return { dot: "bg-emerald-400", label: "online", text: "text-emerald-400" };
    case "searching":
      return { dot: "bg-emerald-400 animate-pulse", label: "searching", text: "text-emerald-400" };
    case "working":
      return { dot: "bg-amber-400 animate-pulse", label: "working", text: "text-amber-400" };
    case "analyzing":
      return { dot: "bg-sky-400 animate-pulse", label: "analyzing", text: "text-sky-400" };
    case "building":
      return { dot: "bg-violet-400 animate-pulse", label: "building", text: "text-violet-400" };
    case "talking":
      return { dot: "bg-cyan-400 animate-pulse", label: "talking", text: "text-cyan-400" };
    case "monitoring":
      return { dot: "bg-indigo-400", label: "monitoring", text: "text-indigo-400" };
    case "watching":
      return { dot: "bg-orange-400", label: "watching", text: "text-orange-400" };
    case "error":
      return { dot: "bg-red-500", label: "error", text: "text-red-500" };
    case "paused":
      return { dot: "bg-zinc-500", label: "paused", text: "text-zinc-500" };
    default:
      return { dot: "bg-zinc-600", label: "idle", text: "text-zinc-500" };
  }
}

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-zinc-100 text-zinc-700 border-zinc-300",
  RESEARCHING: "bg-sky-50 text-sky-700 border-sky-200",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
  REPLIED: "bg-violet-50 text-violet-700 border-violet-200",
  DEMO_SENT: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  INTERESTED: "bg-amber-50 text-amber-700 border-amber-200",
  MEETING: "bg-orange-50 text-orange-700 border-orange-200",
  PROPOSAL: "bg-orange-50 text-orange-700 border-orange-200",
  WON: "bg-emerald-100 text-emerald-800 border-emerald-300",
  LOST: "bg-red-50 text-red-700 border-red-200",
  OPTED_OUT: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export const PRODUCT_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  PREMIUM_WEBSITE: "Premium Website",
  WEBSITE_PLUS_RECEPTIONIST: "Website + Receptionist",
  AI_RECEPTIONIST: "AI Receptionist",
  NONE: "No fit",
};

export const PRODUCT_COLORS: Record<string, string> = {
  WEBSITE: "text-emerald-400",
  PREMIUM_WEBSITE: "text-violet-400",
  WEBSITE_PLUS_RECEPTIONIST: "text-amber-400",
  AI_RECEPTIONIST: "text-cyan-400",
  NONE: "text-zinc-500",
};

export function formatZAR(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return `R${value.toLocaleString()}`;
}

export function timeAgo(ts: number | undefined | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}