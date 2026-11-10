import type { ReactNode } from "react";

export const STATUS_STYLE: Record<string, string> = {
  new: "bg-sky-50 text-sky-700",
  matching: "bg-amber-50 text-amber-700",
  shortlisted: "bg-brand-50 text-brand-700",
  contacted: "bg-[#F3EEFF] text-[#5B3FB0]",
  matched: "bg-sage-50 text-sage-700",
  closed: "bg-ink-950/5 text-ink-500",
  accepted: "bg-sage-50 text-sage-700",
  declined: "bg-ink-950/5 text-ink-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`chip ${STATUS_STYLE[status] ?? "bg-ink-950/5 text-ink-700"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  if (source === "claude")
    return (
      <span className="chip bg-[#FBF1EA] text-[#A4532A]" title="Created through Claude via MCP">
        <ClaudeMark className="h-3 w-3" /> via Claude
      </span>
    );
  if (source === "seed") return <span className="chip bg-ink-950/5 text-ink-500">Demo</span>;
  return <span className="chip bg-ink-950/5 text-ink-500">Manual</span>;
}

export function DemoBadge() {
  return <span className="chip bg-amber-50 text-amber-700" title="Fictional demo profile — not a real person">Fictional demo</span>;
}

export function ClaudeMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 6.1L19 5l-3.1 5.4L22 12l-6.1 1.6L19 19l-5.4-3.1L12 22l-1.6-6.1L5 19l3.1-5.4L2 12l6.1-1.6L5 5l5.4 3.1z" />
    </svg>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-bold">{title}</h1>
        {subtitle && <p className="text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#3F9A63" : score >= 60 ? "#D9921A" : "#B9BEC6";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Compatibility ${score} of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECEDEF" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-bold text-[15px] text-ink-950">{score}</span>
    </div>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const palette = ["#FFE3DA", "#E3F0E7", "#E6EEFB", "#F3EEFF", "#FFF1D6", "#E8F4F6"];
  const ink = ["#B93A1F", "#2B6E46", "#2457A8", "#5B3FB0", "#9A6510", "#2A6672"];
  const i = [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % palette.length;
  return (
    <div className="grid place-items-center rounded-full font-semibold shrink-0" style={{ width: size, height: size, background: palette[i], color: ink[i], fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export const inr = (n: number | null | undefined) => (n == null ? "—" : "₹" + n.toLocaleString("en-IN"));

export function budgetText(min: number | null, max: number | null) {
  if (min == null && max == null) return "Any";
  if (min == null) return `Up to ${inr(max)}`;
  if (max == null) return `From ${inr(min)}`;
  return `${inr(min)} – ${inr(max)}`;
}

export function dateText(d: string | null) {
  if (!d) return "Flexible";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function timeAgo(d: Date | string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
