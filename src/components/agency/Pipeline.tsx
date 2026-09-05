import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  formatZAR,
  LEAD_STATUS_COLORS,
  PRODUCT_COLORS,
  PRODUCT_LABELS,
  timeAgo,
} from "@/lib/agents";
import { Search, SearchX } from "lucide-react";
import { LeadSheet } from "./LeadSheet";
import type { Id } from "@/convex/_generated/dataModel";

export function Pipeline() {
  const leads = useQuery(api.leads.listLeads);
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<Id<"leads"> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads ?? [];
    return (leads ?? []).filter(
      (l) =>
        l.business.toLowerCase().includes(q) ||
        (l.industry ?? "").toLowerCase().includes(q) ||
        (l.location ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q),
    );
  }, [leads, query]);

  const openLead = (id: Id<"leads">) => {
    setOpenLeadId(id);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {leads?.length ?? 0} businesses being worked by the agency. Click any
            row for the full opportunity report.
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses, industries…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8">
        <Table>
          <TableHeader className="bg-card/60">
            <TableRow className="hover:bg-transparent">
              <TableHead>Business</TableHead>
              <TableHead className="hidden md:table-cell">Industry</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead className="hidden sm:table-cell">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead) => (
              <TableRow
                key={lead._id}
                onClick={() => openLead(lead._id)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[11px] font-bold"
                      style={{
                        backgroundColor: `${AGENT_COLOR(lead.industry)}1a`,
                        color: AGENT_COLOR(lead.industry),
                      }}
                    >
                      {lead.business.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lead.business}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lead.website ?? lead.email ?? "no web presence"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {lead.industry ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {lead.location ?? "—"}
                </TableCell>
                <TableCell>
                  {lead.recommendedProduct && lead.recommendedProduct !== "NONE" ? (
                    <span
                      className={`text-sm font-medium ${PRODUCT_COLORS[lead.recommendedProduct]}`}
                    >
                      {PRODUCT_LABELS[lead.recommendedProduct]}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden font-mono text-sm sm:table-cell">
                  {formatZAR(lead.recommendedPrice)}
                </TableCell>
                <TableCell>
                  <Badge className={LEAD_STATUS_COLORS[lead.status]}>{lead.status}</Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {timeAgo(lead.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <SearchX className="size-6" />
                    <p className="text-sm">No leads match your search.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LeadSheet
        leadId={openLeadId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function AGENT_COLOR(industry: string | undefined): string {
  const map: Record<string, string> = {
    Construction: "#f59e0b",
    Plumbing: "#0ea5e9",
    Electrician: "#f59e0b",
    "Mechanic / Auto Repair": "#f43f5e",
    "Restaurant / Cafe": "#f97316",
    "Salon / Barbershop": "#ec4899",
    "Real Estate": "#10b981",
    Landscaping: "#84cc16",
    Roofing: "#f97316",
    Security: "#6366f1",
    "Cleaning / Janitorial": "#06b6d4",
    "Gym / Fitness": "#8b5cf6",
    "Hotel / Accommodation": "#0ea5e9",
    Healthcare: "#10b981",
    "Professional Services": "#6366f1",
    Retail: "#ec4899",
  };
  return map[industry ?? ""] ?? "#a1a1aa";
}