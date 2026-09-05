import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarClock,
  CheckCircle2,
  Globe,
  Handshake,
  Megaphone,
  MessageSquareText,
  Palette,
  PhoneCall,
  Play,
  Radar,
  RefreshCw,
  Repeat,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Telescope,
  Terminal,
  Workflow,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { AGENT_META, AGENT_ORDER } from "@/lib/agents";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

function AgentGlyph({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const meta = AGENT_META[name];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl border border-white/10 ${
        size === "lg" ? "size-14" : "size-10"
      }`}
      style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
    >
      <Icon className={size === "lg" ? "size-7" : "size-5"} />
    </div>
  );
}

const LOOP_STEPS = [
  {
    icon: Radar,
    agent: "NOVA",
    title: "Discover",
    text: "Continuously scans directories and the web for businesses in your target market that need what you sell.",
  },
  {
    icon: Telescope,
    agent: "ATLAS",
    title: "Research",
    text: "Audits websites, maps the customer experience and writes an opportunity report for every qualified lead.",
  },
  {
    icon: Palette,
    agent: "PIXEL",
    title: "Build",
    text: "Designs, builds and deploys a personalized website or AI receptionist demo — before the prospect even replies.",
  },
  {
    icon: Megaphone,
    agent: "VEX",
    title: "Sell",
    text: "Sends personalized offers, answers replies, handles objections and moves serious buyers forward.",
  },
  {
    icon: RefreshCw,
    agent: "MERCURY",
    title: "Follow up",
    text: "Tracks silent prospects on a timed cadence and stops instantly when someone opts out.",
  },
  {
    icon: Handshake,
    agent: "ORION",
    title: "Close",
    text: "Scores buying intent, books meetings, and notifies you the moment a human touch is needed.",
  },
];

const PILLARS = [
  {
    icon: Workflow,
    title: "Zero-button operation",
    text: "The agency runs on background cycles — discovering, researching, selling and following up with no input from you. The chat is for instructions, not babysitting.",
  },
  {
    icon: Rocket,
    title: "Demos before the pitch",
    text: "Every lead gets a working demo of their own website or receptionist built from their real business data before the first follow-up lands.",
  },
  {
    icon: PhoneCall,
    title: "24/7 inbound voice",
    text: "ECHO answers every call, qualifies enquiries and books appointments into your calendar — even at 3am.",
  },
  {
    icon: BellRing,
    title: "Humans only when it matters",
    text: "NEXUS and ORION decide what's important. You get notified for high-intent buyers, booked meetings and deals — never for busywork.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const goToApp = () => {
    navigate(isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400">
              <Bot className="size-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              B2K <span className="text-muted-foreground">Agency OS</span>
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#loop" className="transition-colors hover:text-foreground">The Loop</a>
            <a href="#team" className="transition-colors hover:text-foreground">The Team</a>
            <a href="#why" className="transition-colors hover:text-foreground">Why B2K</a>
          </nav>
          <Button onClick={goToApp} className="gap-2 rounded-full">
            Open Command Center <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="bg-grid bg-grid-fade absolute inset-0" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[140px]" />
        <div className="relative mx-auto max-w-6xl px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5 text-xs font-medium text-amber-300"
          >
            <Sparkles className="size-3.5" />
            Autonomous AI Agency Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            You've hired an entire{" "}
            <span className="text-glow-amber text-amber-400">AI company.</span>
            <br />
            It never sleeps.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
          >
            B2K Agency OS finds businesses, researches them, builds personalized
            demos, sends outreach, answers calls and follows up —{" "}
            <span className="text-foreground">24/7, with zero buttons to press</span>.
            You step in only when a serious buyer needs a human.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button onClick={goToApp} size="lg" className="gap-2 rounded-full px-7 text-base">
              <Play className="size-4 fill-current" />
              Open the Command Center
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-7 text-base"
            >
              <a href="#team">Meet the team</a>
            </Button>
          </motion.div>

          {/* live ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mx-auto mt-14 max-w-2xl rounded-2xl border border-white/8 bg-card/60 p-4 text-left backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Terminal className="size-3.5 text-amber-400" />
              LIVE — autonomous cycle log
              <span className="ml-auto flex items-center gap-1.5 text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                running
              </span>
            </div>
            <div className="space-y-2 font-mono text-[12px] leading-5">
              {[
                { agent: "NOVA", text: "discovered 2 new prospects · roofing in Centurion", t: "00:02" },
                { agent: "ATLAS", text: "opportunity report ready · AquaFix Plumbing", t: "00:04" },
                { agent: "PIXEL", text: "website demo deployed · beacon-ridge-builders", t: "00:06" },
                { agent: "VEX", text: "personalized offer sent · Kingspan Roofing Co.", t: "00:08" },
                { agent: "ECHO", text: "answered inbound call · booked consultation", t: "00:11" },
              ].map((line, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="w-14 shrink-0 text-amber-400/80">{line.agent}</span>
                  <span className="text-muted-foreground">{line.text}</span>
                  <span className="ml-auto shrink-0 text-zinc-600">{line.t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── The Loop ────────────────────────────────────────── */}
      <section id="loop" className="relative py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              The autonomous loop
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From street corner to signed deal. On its own.
            </h2>
            <p className="mt-4 text-muted-foreground">
              One continuous pipeline — every step executed by a specialized
              agent, coordinated by NEXUS. No dashboards to refresh, no buttons
              to press, no campaigns to launch.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group rounded-2xl border border-white/8 bg-card/50 p-6 transition-colors hover:border-amber-400/25 hover:bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-amber-400">
                    <step.icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      STEP {String(i + 1).padStart(2, "0")} · {step.agent}
                    </p>
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {step.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Team ────────────────────────────────────────── */}
      <section id="team" className="relative py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/6 blur-[140px]" />
        <div className="relative mx-auto max-w-6xl px-5">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              The team
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Eight specialists. One director. Zero payroll.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Each agent is a named role with a defined job — visible, auditable
              and always on the clock. They appear as a living team inside your
              command center.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENT_ORDER.map((name, i) => {
              const meta = AGENT_META[name];
              return (
                <motion.div
                  key={name}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
                  className="group flex flex-col rounded-2xl border border-white/8 bg-card/50 p-5 transition-all hover:-translate-y-1 hover:border-white/15 hover:bg-card"
                >
                  <div className="flex items-center justify-between">
                    <AgentGlyph name={name} />
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                      active
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight">{meta.displayName}</h3>
                  <p className="text-xs font-medium" style={{ color: meta.color }}>
                    {meta.role}
                  </p>
                  <p className="mt-2.5 text-[13px] leading-5 text-muted-foreground">
                    {meta.tagline}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why ─────────────────────────────────────────────── */}
      <section id="why" className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Why B2K
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              It should feel like you own an agency, not an app.
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                className="rounded-2xl border border-white/8 bg-card/50 p-7"
              >
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-amber-400">
                  <pillar.icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{pillar.title}</h3>
                <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                  {pillar.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* outcome strip */}
          <motion.div
            {...fadeUp}
            className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/5 sm:grid-cols-4"
          >
            {[
              { icon: Radar, k: "Leads found", v: "Autonomously, per cycle" },
              { icon: Rocket, k: "Demos built", v: "Before first follow-up" },
              { icon: PhoneCall, k: "Calls answered", v: "24/7, every day" },
              { icon: BellRing, k: "Human escalations", v: "Only what matters" },
            ].map((stat) => (
              <div key={stat.k} className="bg-card/70 p-6">
                <stat.icon className="size-5 text-amber-400" />
                <p className="mt-3 font-mono text-sm font-semibold">{stat.v}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.k}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        <div className="bg-grid bg-grid-fade absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 blur-[120px]" />
        <motion.div {...fadeUp} className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="mx-auto mb-6 flex items-center justify-center gap-3">
            {AGENT_ORDER.slice(0, 5).map((name) => (
              <AgentGlyph key={name} name={name} />
            ))}
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Configure once.{" "}
            <span className="text-glow-amber text-amber-400">Watch it work.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Set your target market, pricing and tone — then let the agency run.
            You'll be notified when a serious buyer needs you on the line.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={goToApp} size="lg" className="gap-2 rounded-full px-8 text-base">
              Launch my AI agency <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-400" />
            Full safety controls — pause email, sales or everything with one switch.
          </p>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="size-4 text-amber-400" />
            B2K Agency OS
          </div>
          <p className="text-xs text-muted-foreground">
            Built to feel like you hired an entire company. Operating 24/7.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Demo mode
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="size-3.5 text-zinc-500" /> No buttons required
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}