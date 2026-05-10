"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/ui/Topbar";
import { getDashboard } from "@/lib/api";
import type { DashboardData } from "@/lib/types";

const CRITICALITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#22c55e",
};
const RISK_STATUS_COLORS: Record<string, string> = {
  Open: "#ef4444",
  "In Mitigation": "#f97316",
  Accepted: "#6366f1",
  Closed: "#22c55e",
};

function DonutChart({
  data,
  colors,
  getSegmentHref,
}: {
  data: [string, number][];
  colors: Record<string, string>;
  getSegmentHref?: (label: string) => string;
}) {
  const router = useRouter();
  const total = data.reduce((s, [, v]) => s + v, 0);
  if (total === 0) {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13 }}>
        No data
      </div>
    );
  }
  const radius = 50;
  const cx = 70;
  const cy = 70;
  const strokeW = 18;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const segments = data.map(([label, value]) => {
    const seg = { label, value, dashArray: circ * (value / total), dashOffset: -(offset * circ), color: colors[label] || "#64748b" };
    offset += value / total;
    return seg;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={140} height={140}>
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${seg.dashArray} ${circ}`}
            strokeDashoffset={seg.dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            className={getSegmentHref ? "db-segment" : undefined}
            onClick={getSegmentHref ? () => router.push(getSegmentHref(seg.label)) : undefined}
          />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fill: "#f1f5f9", fontSize: 18, fontWeight: 600 }}>
          {total}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((seg) => {
          const href = getSegmentHref?.(seg.label);
          const swatch = <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />;
          if (href) {
            return (
              <Link key={seg.label} href={href} className="db-legend-link">
                {swatch}
                <span style={{ color: "#94a3b8" }}>{seg.label}</span>
                <span style={{ color: "#f1f5f9", fontWeight: 600, marginLeft: 8 }}>{seg.value}</span>
              </Link>
            );
          }
          return (
            <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              {swatch}
              <span style={{ color: "#94a3b8" }}>{seg.label}</span>
              <span style={{ color: "#f1f5f9", fontWeight: 600, marginLeft: 8 }}>{seg.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarChart({ data, color }: { data: [string, number][]; color: string }) {
  const max = Math.max(...data.map(([, v]) => v), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map(([label, value]) => (
        <div key={label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
            <span>{label}</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{value}</span>
          </div>
          <div style={{ height: 6, background: "#1e2433", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, highlight, href }: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: highlight ? "#f87171" : "#f1f5f9" }}>
        {value.toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="db-card-link">
        <div className="db-card-wrap" style={{ padding: "16px 20px" }}>
          {content}
        </div>
      </Link>
    );
  }
  return <Card style={{ padding: "16px 20px" }}>{content}</Card>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load dashboard"));
  }, []);

  if (error) {
    return (
      <div>
        <Topbar title="Dashboard" />
        <p className="text-sm mt-8 text-center" style={{ color: "#f87171" }}>{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        <Topbar title="Dashboard" />
        <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>
      </div>
    );
  }

  const criticalityData = Object.entries(data.vendor_by_criticality);
  const riskStatusData = Object.entries(data.risk_by_status);
  const riskCategoryData = Object.entries(data.risk_by_category).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      <Topbar title="Dashboard" />

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <MetricCard label="Vendors" value={data.vendor_count} href="/vendors" />
        <MetricCard label="Assets" value={data.asset_count} href="/assets" />
        <MetricCard
          label="Total Risks"
          value={data.risk_count}
          sub={`${data.open_risk_count} open`}
          highlight={data.open_risk_count > 0}
          href="/risks"
        />
        <MetricCard
          label="Assessments"
          value={data.assessment_count}
          href="/assessments?status=In+Progress"
        />
        <MetricCard
          label="Overdue Assessments"
          value={data.overdue_count}
          highlight={data.overdue_count > 0}
          href="/assessments"
        />
      </div>

      {/* Charts row — Vendor Distribution (segment links) + Risk Trend (whole-card link) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Vendors by Criticality</h3>
          <DonutChart
            data={criticalityData}
            colors={CRITICALITY_COLORS}
            getSegmentHref={(label) => `/vendors?criticality=${encodeURIComponent(label)}`}
          />
        </Card>
        <Link href="/risks" className="db-card-link">
          <div className="db-card-wrap" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Risks by Status</h3>
            <DonutChart data={riskStatusData} colors={RISK_STATUS_COLORS} />
          </div>
        </Link>
      </div>

      {riskCategoryData.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Risks by Category</h3>
          <BarChart data={riskCategoryData} color="#6366f1" />
        </Card>
      )}

      {/* Top Risk Vendors — whole row clickable */}
      {data.top_risk_vendors.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Top Risk Vendors</h3>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Vendor", "Criticality", "Risks", "Max Score"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_risk_vendors.map((v) => (
                <tr
                  key={v.id}
                  className="db-row"
                  onClick={() => router.push(`/vendors/${v.id}`)}
                  style={{ borderBottom: "0.5px solid #1e2433" }}
                >
                  <td className="py-2 px-3" style={{ color: "#818cf8" }}>{v.name}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{v.criticality}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{v.risk_count}</td>
                  <td className="py-2 px-3">
                    <span style={{
                      fontWeight: 600,
                      color: v.max_risk_score >= 20 ? "#ef4444" : v.max_risk_score >= 15 ? "#f97316" : v.max_risk_score >= 10 ? "#f59e0b" : "#22c55e",
                    }}>
                      {v.max_risk_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Recent Risks + Overdue Assessments — each item is a link */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Recent Risks</h3>
          {data.recent_risks.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "16px 0" }}>No risks yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.recent_risks.map((r) => (
                <Link
                  key={r.id}
                  href={`/risks/${r.id}/edit`}
                  className="db-list-link"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#f1f5f9" }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{r.vendor_name} · {r.category}</div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
                    background: r.risk_score >= 20 ? "#fef2f2" : r.risk_score >= 15 ? "#fff7ed" : r.risk_score >= 10 ? "#fefce8" : "#f0fdf4",
                    color: r.risk_score >= 20 ? "#991b1b" : r.risk_score >= 15 ? "#9a3412" : r.risk_score >= 10 ? "#854d0e" : "#166534",
                  }}>
                    {r.risk_score}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Overdue Assessments</h3>
          {data.overdue_assessments.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "16px 0" }}>No overdue assessments.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.overdue_assessments.map((a) => (
                <Link
                  key={a.id}
                  href={`/assessments/${a.id}`}
                  className="db-list-link"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#f1f5f9" }}>{a.vendor_name || "Unknown"}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {a.type.replace(/_/g, " ")} · Due {a.due_date}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>+{a.days_overdue}d</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
