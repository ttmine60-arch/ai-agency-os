import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Badge,
  Button,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import {
  formatZAR,
  LEAD_STATUS_COLORS,
  PRODUCT_COLORS,
  PRODUCT_LABELS,
  timeAgo,
} from "@/lib/agents";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { AgentAvatar } from "./AgentAvatar";

const EVENT_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  discovered: { icon: Globe, color: "text-emerald-400" },
  researched: { icon: Sparkles, color: "text-sky-400" },
  offer_sent: { icon: Mail, color: "text-blue-400" },
  reply_received: { icon: MessageSquareText, color: "text-violet-400" },
  demo_sent: { icon: ExternalLink, color: "text-fuchsia-400" },
  demo_viewed: { icon: CheckCircle2, color: "text-emerald-400" },
  follow_up_sent: { icon: Mail, color: "text-indigo-400" },
  appointment_booked: { icon: CalendarClock, color: "text-orange-400" },
  status_changed: { icon: Sparkles, color: "text-amber-400" },
  deal_won: { icon: CheckCircle2, color: "text-emerald-400" },
  deal_lost: { icon: XCircle, color: "text-red-400" },
  opted_out: { icon: XCircle, color: "text-zinc-500" },
};

export function LeadSheet({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: Id<"leads"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useQuery(api.leads.getLead, leadId ? { leadId } : "skip");
  const updateStatus = useMutation(api.leads.updateLeadStatus);

  const lead = data?.lead;
  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-white/10 bg-background p-0 sm:max-w-xl">
        {lead ? (
          <>
            <SheetHeader className="border-b border-white/8 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SheetTitle className="text-xl">{lead.business}</SheetTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {lead.industry && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3.5" /> {lead.industry}
                      </span>
                    )}
                    {lead.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" /> {lead.location}
                      </span>
                    )}
                    {lead.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="size-3.5" /> {lead.website}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={LEAD_STATUS_COLORS[lead.status]}>{lead.status}</Badge>
              </div>
            </SheetHeader>

            <div className="space-y-6 px-6 py-5">
              {/* manual status control */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Move lead:
                </span>
                <Select
                  value={lead.status}
                  onValueChange={(value) => {
                    updateStatus({ leadId: lead._id, status: value as never });
                    toast.success(`${lead.business} → ${value}`);
                  }}
                >
                  <SelectTrigger className="h-8 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "NEW",
                      "RESEARCHING",
                      "QUALIFIED",
                      "CONTACTED",
                      "REPLIED",
                      "DEMO_SENT",
                      "INTERESTED",
                      "MEETING",
                      "PROPOSAL",
                      "WON",
                      "LOST",
                      "OPTED_OUT",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* recommendation */}
              {lead.recommendedProduct && lead.recommendedProduct !== "NONE" && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      NEXUS recommendation
                    </p>
                    <span
                      className={`font-mono text-sm font-bold ${PRODUCT_COLORS[lead.recommendedProduct]}`}
                    >
                      {formatZAR(lead.recommendedPrice)}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold">
                    {PRODUCT_LABELS[lead.recommendedProduct]}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {lead.recommendationReason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {lead.weaknesses?.slice(0, 4).map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <AlertTriangle className="size-3 text-amber-400" />
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* scores */}
              {lead.websiteScore !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/8 bg-card/60 p-4">
                    <p className="text-xs text-muted-foreground">Website score</p>
                    <p className="mt-1 font-mono text-2xl font-bold">
                      {lead.websiteScore}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-card/60 p-4">
                    <p className="text-xs text-muted-foreground">Opportunity score</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-amber-400">
                      {lead.opportunityScore}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </p>
                  </div>
                </div>
              )}

              {/* research summary */}
              {lead.researchSummary && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Opportunity report · ATLAS
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {lead.researchSummary}
                  </p>
                </div>
              )}

              {/* demos */}
              {(lead.demoUrl || lead.receptionistDemoUrl) && (
                <div className="rounded-xl border border-white/8 bg-card/60 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live demos · PIXEL
                  </p>
                  <div className="flex flex-col gap-2">
                    {lead.demoUrl && (
                      <a
                        href={lead.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-violet-400/40"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="size-4 text-violet-400" /> Website demo
                        </span>
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {lead.receptionistDemoUrl && (
                      <a
                        href={lead.receptionistDemoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-cyan-400/40"
                      >
                        <span className="flex items-center gap-2">
                          <Phone className="size-4 text-cyan-400" /> Receptionist demo
                        </span>
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* appointment */}
              {lead.appointment?.scheduledAt && (
                <div className="flex items-center gap-3 rounded-xl border border-orange-400/20 bg-orange-400/5 p-4">
                  <CalendarClock className="size-5 shrink-0 text-orange-400" />
                  <div>
                    <p className="text-sm font-semibold">{lead.appointment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lead.appointment.scheduledAt).toLocaleString()}
                      {lead.appointment.notes ? ` · ${lead.appointment.notes}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* conversation */}
              {lead.conversation && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Conversation · VEX
                  </p>
                  <ScrollArea className="h-64 rounded-xl border border-white/8 bg-black/30 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-muted-foreground">
                      {lead.conversation}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* event timeline */}
              {data && data.events.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Timeline
                  </p>
                  <div className="space-y-1">
                    {data.events.map((e, i) => {
                      const meta = EVENT_ICONS[e.type] ?? EVENT_ICONS.status_changed;
                      const Icon = meta.icon;
                      return (
                        <div key={e._id} className="flex items-start gap-3 py-1.5">
                          <Icon className={`mt-0.5 size-4 shrink-0 ${meta.color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] capitalize text-foreground">
                              {e.type.replace(/_/g, " ")}
                            </p>
                            {e.subject && (
                              <p className="truncate text-xs text-muted-foreground">
                                {e.subject}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {timeAgo(e.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* contact info */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/8 bg-card/60 p-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" /> <span className="truncate">{lead.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" /> <span>{lead.phone ?? "—"}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <SheetHeader className="px-6 py-5">
            <SheetTitle>Loading lead…</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}