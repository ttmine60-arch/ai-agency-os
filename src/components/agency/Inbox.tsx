import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui";
import { LEAD_STATUS_COLORS, timeAgo } from "@/lib/agents";
import { AgentAvatar } from "./AgentAvatar";
import { LeadSheet } from "./LeadSheet";
import { Inbox as InboxIcon, MailOpen } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export function Inbox() {
  const leads = useQuery(api.leads.listLeads);
  const [openLeadId, setOpenLeadId] = useState<Id<"leads"> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const conversations = useMemo(() => {
    return (leads ?? [])
      .filter(
        (l) =>
          l.conversation ||
          l.lastMessageFromProspect ||
          l.lastOfferSubject ||
          l.lastMessageFromVex,
      )
      .sort((a, b) => (b.lastContactAt ?? b.updatedAt) - (a.lastContactAt ?? a.updatedAt));
  }, [leads]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every conversation the agency is having on your behalf. VEX handles
          the replies — you read along.
        </p>
      </div>

      <div className="space-y-2">
        {conversations.map((lead) => {
          const latest =
            lead.lastMessageFromProspect ?? lead.lastMessageFromVex ?? lead.conversation;
          const isProspect = !!lead.lastMessageFromProspect;
          return (
            <button
              key={lead._id}
              onClick={() => {
                setOpenLeadId(lead._id);
                setSheetOpen(true);
              }}
              className="flex w-full items-start gap-4 rounded-2xl border border-white/8 bg-card/50 p-4 text-left transition-colors hover:border-amber-400/25"
            >
              <div className="relative mt-0.5">
                <AgentAvatar name={lead.lastMessageFromProspect ? "VEX" : "NEXUS"} />
                {lead.highIntent && (
                  <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-background bg-amber-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold">{lead.business}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(lead.lastContactAt ?? lead.updatedAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {lead.lastOfferSubject ?? `${lead.industry ?? "Business"} conversation`}
                </p>
                {latest && (
                  <p
                    className={`mt-1.5 line-clamp-2 text-[13px] leading-5 ${
                      isProspect ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {isProspect ? "→ " : "← "}
                    {latest.replace(/\n/g, " ").slice(0, 180)}
                  </p>
                )}
              </div>
              <Badge className={LEAD_STATUS_COLORS[lead.status]}>{lead.status}</Badge>
            </button>
          );
        })}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-card/50 py-16 text-muted-foreground">
            <MailOpen className="size-8" />
            <p className="text-sm">
              No conversations yet — VEX starts outreach after research completes.
            </p>
          </div>
        )}
      </div>

      <LeadSheet
        leadId={openLeadId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}