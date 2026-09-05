import { AGENT_META } from "@/lib/agents";
import { cn } from "@/lib/utils";

export function AgentAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = AGENT_META[name];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-white/10",
        size === "sm" && "size-7",
        size === "md" && "size-9",
        size === "lg" && "size-12",
        className,
      )}
      style={{ backgroundColor: `${meta.color}16`, color: meta.color }}
    >
      <Icon className={size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-6"} />
    </div>
  );
}