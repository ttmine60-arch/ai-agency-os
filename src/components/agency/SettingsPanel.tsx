import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, Input, Label, Switch } from "@/components/ui";
import { toast } from "sonner";
import { AlertTriangle, KeyRound, Save, ShieldCheck } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

type Settings = Doc<"agencySettings">;

type Draft = Pick<
  Settings,
  "targetIndustries" | "targetRegions" | "targetKeywords" | "pricing" | "email" | "outreach"
> & {
  agencyName?: string;
  agencySignature?: string;
  ownerEmail?: string;
  demoDomain?: string;
  demoEmail?: string;
};

const INDUSTRY_OPTIONS = [
  "Construction",
  "Plumbing",
  "Electrician",
  "Mechanic / Auto Repair",
  "Restaurant / Cafe",
  "Salon / Barbershop",
  "Real Estate",
  "Landscaping",
  "Roofing",
  "Security",
  "Cleaning / Janitorial",
  "Gym / Fitness",
  "Hotel / Accommodation",
  "Home Services",
  "Professional Services",
  "Healthcare",
  "Retail",
];

const SAFETY_ROWS: {
  key: keyof Settings["safety"];
  label: string;
  description: string;
}[] = [
  { key: "stopAllAgents", label: "Emergency stop — pause everything", description: "Halts every agent mid-cycle until you release it." },
  { key: "pauseEmail", label: "Pause email sending", description: "VEX and MERCURY stop all outbound email." },
  { key: "pauseSales", label: "Pause sales outreach", description: "No new offers drafted until re-enabled." },
  { key: "pauseLeadHunter", label: "Pause lead hunting", description: "NOVA stops discovering new businesses." },
  { key: "pauseWebsiteBuilder", label: "Pause website building", description: "PIXEL stops building demos." },
  { key: "pauseReceptionist", label: "Pause receptionist", description: "ECHO stops answering inbound calls." },
];

export function SettingsPanel() {
  const settings = useQuery(api.settings.getSettings);
  const updateSettings = useMutation(api.settings.updateSettings);
  const toggleSafety = useMutation(api.settings.toggleSafety);
  const setMode = useMutation(api.settings.setMode);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !draft) {
      setDraft({
        agencyName: settings.agencyName,
        agencySignature: settings.agencySignature,
        ownerEmail: settings.ownerEmail,
        demoDomain: settings.demoDomain,
        demoEmail: settings.demoEmail,
        targetIndustries: settings.targetIndustries,
        targetRegions: settings.targetRegions,
        targetKeywords: settings.targetKeywords,
        pricing: settings.pricing,
        email: settings.email,
        outreach: settings.outreach,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!settings || !draft) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Loading configuration…</p>
      </div>
    );
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const setNested = <T extends object>(section: keyof Draft, patch: Partial<T>) =>
    setDraft((d) => (d ? { ...d, [section]: { ...(d[section] as object), ...patch } } : d));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        agencyName: draft.agencyName,
        agencySignature: draft.agencySignature,
        ownerEmail: draft.ownerEmail,
        targetIndustries: draft.targetIndustries,
        targetRegions: draft.targetRegions,
        targetKeywords: draft.targetKeywords,
        pricing: draft.pricing,
        email: draft.email,
        outreach: draft.outreach,
        demoDomain: draft.demoDomain,
        demoEmail: draft.demoEmail,
      });
      toast.success("Agency configuration saved — NEXUS will use it next cycle");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const section = "rounded-2xl border border-white/8 bg-card/50 p-5";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell the agency who to hunt, what to charge and how to behave. It
            handles the rest.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? "Saving…" : "Save configuration"}
        </Button>
      </div>

      {/* agency identity */}
      <div className={section}>
        <h3 className="text-sm font-semibold">Agency identity</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Agency name</Label>
            <Input
              className="mt-1.5"
              value={draft.agencyName ?? ""}
              onChange={(e) => set("agencyName", e.target.value)}
            />
          </div>
          <div>
            <Label>Email signature</Label>
            <Input
              className="mt-1.5"
              value={draft.agencySignature ?? ""}
              onChange={(e) => set("agencySignature", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* target market */}
      <div className={section}>
        <h3 className="text-sm font-semibold">Target market</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          NOVA hunts these industries. NEXUS weights its cycles toward the
          industries that perform best.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((industry) => {
            const active = draft.targetIndustries.includes(industry);
            return (
              <button
                key={industry}
                type="button"
                onClick={() =>
                  set(
                    "targetIndustries",
                    active
                      ? draft.targetIndustries.filter((i) => i !== industry)
                      : [...draft.targetIndustries, industry],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                }`}
              >
                {industry}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Regions (comma separated)</Label>
            <Input
              className="mt-1.5"
              value={draft.targetRegions.join(", ")}
              onChange={(e) =>
                set(
                  "targetRegions",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              placeholder="Gauteng, Western Cape, KwaZulu-Natal"
            />
          </div>
          <div>
            <Label>Search keywords</Label>
            <Input
              className="mt-1.5"
              value={draft.targetKeywords.join(", ")}
              onChange={(e) =>
                set(
                  "targetKeywords",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              placeholder="no website, missed calls"
            />
          </div>
        </div>
      </div>

      {/* pricing */}
      <div className={section}>
        <h3 className="text-sm font-semibold">Pricing (ZAR)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          VEX only quotes inside these bounds. NEXUS may recommend discounts up
          to the max shown.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["websiteFrom", "Website from"],
              ["premiumWebsiteFrom", "Premium website from"],
              ["websitePlusReceptionistFrom", "Website + receptionist from"],
              ["receptionistSetup", "Receptionist setup"],
              ["receptionistMonthly", "Receptionist monthly"],
              ["maxRecommendedDiscount", "Max discount"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                className="mt-1.5 font-mono"
                type="number"
                value={draft.pricing[key] ?? ""}
                onChange={(e) =>
                  setNested<Settings["pricing"]>("pricing", {
                    [key]: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* outreach */}
      <div className={section}>
        <h3 className="text-sm font-semibold">Outreach cadence</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Follow-up days</Label>
            <Input
              className="mt-1.5 font-mono"
              value={draft.outreach.followUpDays.join(", ")}
              onChange={(e) =>
                setNested<Settings["outreach"]>("outreach", {
                  followUpDays: e.target.value
                    .split(",")
                    .map((s) => Number(s.trim()))
                    .filter((n) => !Number.isNaN(n)),
                })
              }
              placeholder="2, 5, 9"
            />
          </div>
          <div>
            <Label>Max follow-ups</Label>
            <Input
              className="mt-1.5 font-mono"
              type="number"
              value={draft.outreach.maxFollowUps}
              onChange={(e) =>
                setNested<Settings["outreach"]>("outreach", {
                  maxFollowUps: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label>Min hours between emails</Label>
            <Input
              className="mt-1.5 font-mono"
              type="number"
              value={draft.outreach.minHoursBetweenEmails}
              onChange={(e) =>
                setNested<Settings["outreach"]>("outreach", {
                  minHoursBetweenEmails: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label>Reply wait hours</Label>
            <Input
              className="mt-1.5 font-mono"
              type="number"
              value={draft.outreach.replyWaitHours}
              onChange={(e) =>
                setNested<Settings["outreach"]>("outreach", {
                  replyWaitHours: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* email + demo */}
      <div className={section}>
        <h3 className="text-sm font-semibold">Delivery & demos</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>From address</Label>
            <Input
              className="mt-1.5"
              value={draft.email.fromAddress ?? ""}
              onChange={(e) =>
                setNested<Settings["email"]>("email", { fromAddress: e.target.value || undefined })
              }
              placeholder="outreach@youragency.com"
            />
          </div>
          <div>
            <Label>From name</Label>
            <Input
              className="mt-1.5"
              value={draft.email.fromName ?? ""}
              onChange={(e) =>
                setNested<Settings["email"]>("email", { fromName: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <Label>Daily email limit</Label>
            <Input
              className="mt-1.5 font-mono"
              type="number"
              value={draft.email.dailyLimit}
              onChange={(e) =>
                setNested<Settings["email"]>("email", {
                  dailyLimit: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label>Demo domain</Label>
            <Input
              className="mt-1.5 font-mono"
              value={draft.demoDomain ?? ""}
              onChange={(e) => set("demoDomain", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* mode */}
      <div className={section}>
        <h3 className="text-sm font-semibold">Operation mode</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          DEMO simulates the loop with a realistic business pool. LIVE sends real
          email, runs real AI copy and voice, and researches real websites once keys
          are configured in the Keys tab.
        </p>
        <div className="mt-4 flex gap-2">
          {(["DEMO", "LIVE"] as const).map((mode) => (
            <Button
              key={mode}
              variant={settings.operationMode === mode ? "default" : "outline"}
              className="gap-2"
              onClick={() => {
                setMode({ mode });
                toast.success(mode === "LIVE" ? "Switched to LIVE mode" : "Switched to DEMO mode");
              }}
            >
              {mode === "DEMO" ? "Demo mode" : "Live mode"}
            </Button>
          ))}
        </div>
      </div>

      {/* safety */}
      <div className={`${section} border-red-400/20`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400" />
          <h3 className="text-sm font-semibold">Safety controls</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Emergency controls — one switch stops the whole agency. You can also
          say "pause everything" to NEXUS in the command chat.
        </p>
        <div className="mt-4 space-y-3">
          {SAFETY_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-background/40 p-3.5"
            >
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <Switch
                checked={settings.safety[row.key]}
                onCheckedChange={(value) => toggleSafety({ key: row.key, value })}
                className={row.key === "stopAllAgents" ? "data-[state=checked]:bg-red-500" : ""}
              />
            </div>
          ))}
        </div>
      </div>

      {/* integrations */}
      <div className={`${section} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold">Live integrations</h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              Add keys in the project's Keys tab to go live:{" "}
              <span className="font-mono text-foreground">RESEND_API_KEY</span>{" "}
              (VEX/MERCURY email), <span className="font-mono text-foreground">GROQ_API_KEY</span>{" "}
              (AI copy + ECHO conversation logic), <span className="font-mono text-foreground">ELEVENLABS_API_KEY</span>{" "}
              (ECHO's voice), <span className="font-mono text-foreground">FIRECRAWL_API_KEY</span>{" "}
              (ATLAS real web research), and Twilio credentials for ECHO inbound calls.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-amber-400">
          <AlertTriangle className="size-3.5" />
          {settings.operationMode}
        </div>
      </div>
    </div>
  );
}