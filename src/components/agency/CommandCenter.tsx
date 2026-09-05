import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AGENT_META, AGENT_ORDER, statusStyle, timeAgo } from "@/lib/agents";
import { AgentAvatar } from "./AgentAvatar";
import { Badge } from "@/components/ui";
import {
  BellRing,
  CheckCheck,
  CircleDollarSign,
  Handshake,
  Mail,
  MessageSquareText,
  Radar,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

const LOG_LEVEL_COLORS: Record<string, string> = {
  info: "text-zinc-500",
  ok: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const NOTIFICATION_COLORS: Record<string, string> = {
  high_intent: "border-amber-400/30 bg-amber-400/5 text-amber-300",
  meeting: "border-orange-400/30 bg-orange-400/5 text-orange-300",
  deal: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
  error: "border-red-400/30 bg-red-400/5 text-red-300",
  info: "border-white/10 bg-white/5 text-muted-foreground",
};

export function CommandCenter() {
  const settings = useQuery(api.settings.getSettings);
  const agents = useQuery(api.agents.listAgents);
  const logs = useQuery(api.logs.listLogs, {});
  const notifications = useQuery(api.notifications.listNotifications);
  const leads = useQuery(api.leads.listLeads);

  const metrics = settings?.metrics;

  const kpis = metrics
    ? [
        { label: "Leads created", value: metrics.leadsCreated, icon: Radar, color: "text-emerald-400" },
        { label: "Emails sent", value: metrics.emailsSent, icon: Mail, color: "text-blue-400" },
        { label: "Replies", value: metrics.repliesReceived, icon: MessageSquareText, color: "text-violet-400" },
        { label: "Demos sent", value: metrics.demosSent, icon: Rocket, color: "text-fuchsia-400" },
        { label: "Meetings booked", value: metrics.meetingsBooked, icon: Handshake, color: "text-orange-400" },
        { label: "Deals won", value: metrics.dealsWon, icon: TrendingUp, color: "text-emerald-400" },
        {
          label: "Revenue won",
          value: `R${metrics.dealValueWon.toLocaleString()}`,
          icon: CircleDollarSign,
          color: "text-amber-400",
        },
      ]
    : [];

  // pipeline snapshot
  const statusCounts = new Map<string, number>();
  for (const lead of leads ?? []) {
    statusCounts.set(lead.status, (statusCounts.get(lead.status) ?? 0) + 1);
  }
  const pipelineOrder = [
    "NEW",
    "RESEARCHING",
    "QUALIFIED",
    "CONTACTED",
    "REPLIED",
    "DEMO_SENT",
    "INTERESTED",
    "MEETING",
    "WON",
  ];

  return (
    <div className="space-y-6">
      {/* greeting */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Command Center</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live view of the agency. The team is operating autonomously — you're
          just watching the feed.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-white/8 bg-card/60 p-4"
          >
            <kpi.icon className={`size-4 ${kpi.color}`} />
            <p className="mt-2.5 font-mono text-xl font-bold leading-none">
              {kpi.value}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* agent strip */}
      <div className="rounded-2xl border border-white/8 bg-card/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">Agents on shift</p>
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            all systems nominal
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(agents ?? []).map((agent) => {
            const meta = AGENT_META[agent.name];
            const st = statusStyle(agent.status);
            const isStale =
              agent.lastHeartbeat && Date.now() - agent.lastHeartbeat > 20 * 60_000;
            return (
              <div
                key={agent._id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-background/40 p-3"
              >
                <AgentAvatar name={agent.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{agent.displayName}</p>
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${isStale ? "bg-zinc-600" : st.dot}`}
                    />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {agent.statusMessage ?? meta?.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* activity feed */}
        <div className="rounded-2xl border border-white/8 bg-card/50 p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Agent activity</p>
            <Sparkles className="size-4 text-amber-400" />
          </div>
          <div className="space-y-1">
            {(logs ?? []).slice(0, 14).map((log) => (
              <div key={log._id} className="flex items-start gap-3 py-1.5">
                <AgentAvatar name={log.agent} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-5 text-muted-foreground">
                    <span className="font-semibold text-foreground">{log.agent}</span>{" "}
                    {log.message}
                  </p>
                  {log.detail && (
                    <p className="truncate text-[11px] text-zinc-500">{log.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-zinc-500">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            ))}
            {(logs ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Waiting for the first cycle…
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* pipeline snapshot */}
          <div className="rounded-2xl border border-white/8 bg-card/50 p-5">
            <p className="mb-3 text-sm font-semibold">Pipeline snapshot</p>
            <div className="space-y-2">
              {pipelineOrder.map((status) => {
                const count = statusCounts.get(status) ?? 0;
                if (count === 0 && status !== "NEW") return null;
                const max =
                  Math.max(...pipelineOrder.map((s) => statusCounts.get(s) ?? 0), 1);
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[11px] text-muted-foreground">
                      {status}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-amber-400/70"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 text-right font-mono text-[11px]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* notifications */}
          <div className="rounded-2xl border border-white/8 bg-card/50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Notifications</p>
              <BellRing className="size-4 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {(notifications ?? []).slice(0, 6).map((n) => (
                <div
                  key={n._id}
                  className={`rounded-lg border px-3 py-2.5 ${NOTIFICATION_COLORS[n.type]} ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <p className="text-[13px] font-medium">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-[11px] leading-4 opacity-80">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] opacity-60">{timeAgo(n.createdAt)}</p>
                </div>
              ))}
              {(notifications ?? []).length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nothing needs you right now.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}