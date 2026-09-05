import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  Avatar,
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "@/components/ui";
import { toast } from "sonner";
import {
  Bell,
  Bot,
  CheckCheck,
  ChevronRight,
  CircleStop,
  Gauge,
  Inbox,
  ListFilter,
  LogOut,
  MessageSquare,
  Play,
  Settings,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/agents";
import { CommandCenter } from "@/components/agency/CommandCenter";
import { Pipeline } from "@/components/agency/Pipeline";
import { AiTeam } from "@/components/agency/AiTeam";
import { Inbox as InboxView } from "@/components/agency/Inbox";
import { CommandChat } from "@/components/agency/CommandChat";
import { SettingsPanel } from "@/components/agency/SettingsPanel";

type Tab = "command" | "pipeline" | "team" | "inbox" | "chat" | "settings";

const NAV: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "command", label: "Command Center", icon: Gauge },
  { id: "pipeline", label: "Pipeline", icon: ListFilter },
  { id: "team", label: "AI Team", icon: Users },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "chat", label: "Command Chat", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("command");
  const [running, setRunning] = useState(false);

  const settings = useQuery(api.settings.getSettings);
  const notifications = useQuery(api.notifications.listNotifications);
  const ensureAgency = useMutation(api.init.ensureAgency);
  const runCycle = useMutation(api.orchestrator.runCycle);
  const toggleSafety = useMutation(api.settings.toggleSafety);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);

  // First-run setup: creates settings + agent roster + demo pipeline.
  useEffect(() => {
    if (settings === null) {
      ensureAgency().catch((err) =>
        console.error("Failed to initialize agency:", err),
      );
    }
  }, [settings, ensureAgency]);

  const handleRunCycle = async () => {
    setRunning(true);
    try {
      const results = await runCycle();
      const summary = results[0]?.summary ?? {};
      const parts = [
        summary.discovered ? `${summary.discovered} discovered` : null,
        summary.researched ? `${summary.researched} researched` : null,
        summary.offersSent ? `${summary.offersSent} offers sent` : null,
        summary.replies ? `${summary.replies} replies` : null,
        summary.meetings ? `${summary.meetings} meetings booked` : null,
        summary.won ? `${summary.won} deals closed` : null,
      ].filter(Boolean);
      toast.success(
        parts.length > 0
          ? `Cycle complete — ${parts.join(" · ")}`
          : "Cycle complete — pipeline is stable",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cycle failed");
    } finally {
      setRunning(false);
    }
  };

  const stopped = settings?.safety.stopAllAgents ?? false;
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/8 bg-card/40 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400">
            <Bot className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {settings?.agencyName ?? "B2K Agency"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Agency OS
            </p>
          </div>
        </div>
        <Separator className="bg-white/8" />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                tab === item.id
                  ? "bg-amber-400/10 font-medium text-amber-300"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
              {item.id === "inbox" && unread > 0 && (
                <span className="ml-auto rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/8 p-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-background/40 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
              {user?.name?.slice(0, 2).toUpperCase() ?? "ME"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.name ?? "Owner"}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user?.email ?? "signed in"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground transition-colors hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-background/80 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400">
              <Bot className="size-4" />
            </div>
            <span className="text-sm font-semibold">B2K OS</span>
          </div>

          <div className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
            <span>{NAV.find((n) => n.id === tab)?.label}</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">
              {settings?.agencyName ?? "Agency"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5",
                settings?.operationMode === "LIVE"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  settings?.operationMode === "LIVE"
                    ? "bg-emerald-400"
                    : "animate-pulse bg-amber-400",
                )}
              />
              {settings?.operationMode ?? "DEMO"} mode
            </Badge>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRunCycle}
              disabled={running || stopped}
            >
              <Play className="size-3.5" />
              {running ? "Running…" : "Run cycle"}
            </Button>

            <Button
              variant={stopped ? "default" : "outline"}
              size="sm"
              className={cn("gap-1.5", stopped && "bg-red-500/90 text-white hover:bg-red-500")}
              onClick={() => {
                toggleSafety({ key: "stopAllAgents", value: !stopped });
                toast[stopped ? "success" : "warning"](
                  stopped
                    ? "Agents resumed — next cycle starts automatically"
                    : "Emergency stop engaged — all agents paused",
                );
              }}
            >
              <CircleStop className="size-3.5" />
              {stopped ? "Resume" : "Stop all"}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="size-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-black">
                      {unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 border-white/10 bg-card p-0">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => markAllRead()}
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {(notifications ?? []).slice(0, 10).map((n) => (
                    <div
                      key={n._id}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-sm",
                        n.read ? "opacity-55" : "bg-amber-400/5",
                      )}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  ))}
                  {(notifications ?? []).length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      No notifications yet.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Avatar className="size-8 lg:hidden">
              <AvatarFallback className="bg-white/10 text-xs">
                {user?.name?.slice(0, 2).toUpperCase() ?? "ME"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* mobile tab strip */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2 lg:hidden">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-amber-400/10 text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* tab content */}
        <main className="flex-1 px-5 py-6 lg:px-8">
          {tab === "command" && <CommandCenter />}
          {tab === "pipeline" && <Pipeline />}
          {tab === "team" && <AiTeam />}
          {tab === "inbox" && <InboxView />}
          {tab === "chat" && <CommandChat />}
          {tab === "settings" && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}