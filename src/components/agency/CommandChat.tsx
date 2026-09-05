import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, Textarea } from "@/components/ui";
import { AgentAvatar } from "./AgentAvatar";
import { Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Focus on roofing leads next cycle",
  "Pause all agents",
  "Resume the team",
  "Tighten the follow-up cadence",
  "What are my best performing industries?",
];

export function CommandChat() {
  const instructions = useQuery(api.chat.listInstructions);
  const sendInstruction = useMutation(api.chat.sendInstruction);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [instructions]);

  const send = async (message?: string) => {
    const body = (message ?? text).trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendInstruction({ text: body });
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send instruction");
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
            <span className="size-1 animate-pulse rounded-full bg-amber-400" />
            queued
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
            <span className="size-1 animate-ping rounded-full bg-amber-400" />
            processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
            <span className="size-1 rounded-full bg-emerald-400" />
            done
          </span>
        );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Command Chat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Instructions are optional. NEXUS queues what you say and folds it into
          the next autonomous cycle — nothing waits on you.
        </p>
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        className="terminal-scroll mt-6 flex-1 space-y-5 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 320px)", minHeight: 320 }}
      >
        <div className="flex items-start gap-3">
          <AgentAvatar name="NEXUS" />
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-white/8 bg-card/60 px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold text-amber-400">
              NEXUS · AI Director
            </p>
            <p className="text-[13px] leading-6 text-muted-foreground">
              Command line open. Tell me what matters — new industries, pricing
              changes, urgency — or say nothing and I'll keep the agency running
              on your configured goals. I'll only interrupt you for real buyers,
              booked meetings and closed deals.
            </p>
          </div>
        </div>

        {(instructions ?? []).map((instruction) => (
          <div key={instruction._id} className="space-y-3">
            {/* owner message */}
            <div className="flex items-start justify-end gap-3">
              <div className="flex max-w-[80%] flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  {statusBadge(instruction.status)}
                </div>
                <div className="rounded-2xl rounded-tr-sm border border-amber-400/25 bg-amber-400/8 px-4 py-3">
                  <p className="text-[13px] leading-6">{instruction.text}</p>
                </div>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground">
                <User className="size-4" />
              </div>
            </div>

            {/* NEXUS response */}
            {instruction.response && (
              <div className="flex items-start gap-3">
                <AgentAvatar name="NEXUS" />
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-white/8 bg-card/60 px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold text-amber-400">
                    NEXUS · acknowledged
                  </p>
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    {instruction.response}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {(instructions ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
            No instructions yet — the agency has been running on its own.
          </div>
        )}
      </div>

      {/* suggestions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={sending}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-amber-400/30 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {/* input */}
      <div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/10 bg-card/60 p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Tell NEXUS what to prioritize… (optional)"
          rows={2}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <Button
          onClick={() => send()}
          disabled={sending || !text.trim()}
          className="gap-2"
        >
          <Send className="size-4" />
          Send
        </Button>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3 text-amber-400" />
        Enter to send · Shift+Enter for a new line · instructions process on the
        next cycle
      </p>
    </div>
  );
}