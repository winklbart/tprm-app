import type { AssessmentStatus, RiskStatus, VendorCriticality, VendorStatus } from "@/lib/types";

const CRITICALITY_STYLES: Record<VendorCriticality, { color: string; bg: string }> = {
  Critical: { color: "#f87171", bg: "#3b1a1a" },
  High:     { color: "#fb923c", bg: "#2d1f0e" },
  Medium:   { color: "#86efac", bg: "#1f2a1a" },
  Low:      { color: "#7dd3fc", bg: "#0f1f2a" },
};

const STATUS_STYLES: Record<VendorStatus, { color: string; bg: string }> = {
  Active:       { color: "#86efac", bg: "#1f2a1a" },
  Inactive:     { color: "#64748b", bg: "#1e2433" },
  "Under Review": { color: "#fb923c", bg: "#2d1f0e" },
  Offboarded:   { color: "#f87171", bg: "#3b1a1a" },
};

interface Props {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}

export function Badge({ children, color = "#64748b", bg = "#1e2433" }: Props) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
      style={{ borderRadius: 8, color, background: bg, border: `0.5px solid ${color}30` }}
    >
      {children}
    </span>
  );
}

const RISK_STATUS_STYLES: Record<RiskStatus, { color: string; bg: string }> = {
  Open:           { color: "#fb923c", bg: "#2d1f0e" },
  "In Mitigation": { color: "#7dd3fc", bg: "#0f1f2a" },
  Accepted:       { color: "#64748b", bg: "#1e2433" },
  Closed:         { color: "#86efac", bg: "#1f2a1a" },
};

export function riskScoreStyle(score: number): { color: string; bg: string } {
  if (score >= 20) return { color: "#f87171", bg: "#3b1a1a" };
  if (score >= 15) return { color: "#fb923c", bg: "#2d1f0e" };
  if (score >= 8)  return { color: "#86efac", bg: "#1f2a1a" };
  return               { color: "#7dd3fc", bg: "#0f1f2a" };
}

export function RiskStatusBadge({ value }: { value: RiskStatus }) {
  const s = RISK_STATUS_STYLES[value];
  return <Badge color={s.color} bg={s.bg}>{value}</Badge>;
}

export function RiskScoreBadge({ value }: { value: number }) {
  const s = riskScoreStyle(value);
  return <Badge color={s.color} bg={s.bg}>{value}</Badge>;
}

const ASSESSMENT_STATUS_STYLES: Record<AssessmentStatus, { color: string; bg: string }> = {
  Draft:       { color: "#64748b", bg: "#1e2433" },
  Sent:        { color: "#7dd3fc", bg: "#0f1f2a" },
  "In Progress": { color: "#fb923c", bg: "#2d1f0e" },
  Completed:   { color: "#86efac", bg: "#1f2a1a" },
  Overdue:     { color: "#f87171", bg: "#3b1a1a" },
  Closed:      { color: "#94a3b8", bg: "#1e2433" },
};

export function AssessmentStatusBadge({ value }: { value: AssessmentStatus }) {
  const s = ASSESSMENT_STATUS_STYLES[value] ?? { color: "#64748b", bg: "#1e2433" };
  return <Badge color={s.color} bg={s.bg}>{value}</Badge>;
}

export function CriticalityBadge({ value }: { value: VendorCriticality }) {
  const s = CRITICALITY_STYLES[value];
  return <Badge color={s.color} bg={s.bg}>{value}</Badge>;
}

export function StatusBadge({ value }: { value: VendorStatus }) {
  const s = STATUS_STYLES[value];
  return <Badge color={s.color} bg={s.bg}>{value}</Badge>;
}
