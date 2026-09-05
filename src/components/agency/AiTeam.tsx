import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AGENT_META, statusStyle, timeAgo } from "@/lib/agents";
import { AgentAvatar } from "./AgentAvatar";
import { Badge, Button } from "@/components/ui";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

export function AiTeam() {
  const agents = useQuery(api.agents.listAgents);
  const togglePause = useMutation(api.agents.toggleAgentPause);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eight named specialists, coordinated by NEXUS. Every agent's status
          below is live — you're watching them work in real time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(agents ?? []).map((agent) => {
          const meta = AGENT_META[agent.name];
          const st = statusStyle(agent.status);
          const isStale =
            agent.lastHeartbeat && Date.now() - agent.lastHeartbeat > 20 * 60_000;
          return (
            <div
              key={agent._id}
              className="flex flex-col rounded-2xl border border-white/8 bg-card/50 p-5 transition-colors hover:border-white/15"
            >
              <div className="flex items-start justify-between">
                <AgentAvatar name={agent.name} size="lg" />
                <Badge
                  variant="outline"
                  className={`gap-1.5 border-white/10 ${st.text}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${isStale ? "bg-zinc-600" : st.dot}`}
                  />
                  {agent.paused ? "paused" : st.label}
                </Badge>
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight">
                {agent.displayName}
              </h3>
              <p className="text-xs font-medium" style={{ color: meta?.color }}>
                {agent.role}
              </p>
              <p className="mt-2.5 flex-1 text-[13px] leading-5 text-muted-foreground">
                {agent.statusMessage ?? meta?.tagline}
              </p>

              <div className="mt-4 space-y-1.5 border-t border-white/8 pt-3 text-[11px] text-muted-foreground">
                {agent.lastAction && (
                  <p className="truncate">
                    <span className="text-zinc-500">last: </span>
                    {agent.lastAction}
                  </p>
                )}
                <p>
                  <span className="text-zinc-500">heartbeat: </span>
                  {timeAgo(agent.lastHeartbeat)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => {
                  togglePause({ agentId: agent._id });
                  toast.success(
                    agent.paused
                      ? `${agent.displayName} resumed`
                      : `${agent.displayName} paused`,
                  );
                }}
              >
                {agent.paused ? (
                  <>
                    <Play className="size-3.5" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="size-3.5" /> Pause
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}