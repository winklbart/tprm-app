"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RiskScoreBadge, RiskStatusBadge, riskScoreStyle } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/ui/Topbar";
import { getRisks } from "@/lib/api";
import type { Risk } from "@/lib/types";

type Cell = { likelihood: number; impact: number };

function cellLabel(score: number): string {
  if (score >= 20) return "Critical";
  if (score >= 15) return "High";
  if (score >= 8)  return "Medium";
  return "Low";
}

export default function RiskHeatmapPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Cell | null>(null);

  useEffect(() => {
    const load = async () => {
      const pages: Risk[] = [];
      let offset = 0;
      while (true) {
        const res = await getRisks({ limit: 100, offset });
        pages.push(...res.items);
        if (pages.length >= res.total) break;
        offset += 100;
      }
      setRisks(pages);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const countAt = (l: number, i: number) =>
    risks.filter((r) => r.likelihood === l && r.impact === i).length;

  const risksAt = (l: number, i: number) =>
    risks.filter((r) => r.likelihood === l && r.impact === i);

  const selectedRisks = selected ? risksAt(selected.likelihood, selected.impact) : [];

  return (
    <div>
      <Topbar
        title="Risk Heatmap"
        actions={
          <Link href="/risks">
            <Button variant="secondary" size="sm">← Risk Register</Button>
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>Loading…</p>
      ) : (
        <div className="flex gap-6 items-start flex-wrap">
          {/* Heatmap grid */}
          <div>
            <div className="flex gap-2 mb-3 items-center">
              <span className="text-xs font-medium" style={{ color: "#64748b", width: 90 }}>
                Likelihood ↑ / Impact →
              </span>
            </div>

            {/* Impact axis header */}
            <div className="flex" style={{ marginLeft: 90 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="text-xs font-medium text-center"
                  style={{ width: 80, color: "#64748b", paddingBottom: 6 }}
                >
                  {i}
                </div>
              ))}
            </div>

            {/* Rows: likelihood 5→1 (high at top) */}
            {[5, 4, 3, 2, 1].map((l) => (
              <div key={l} className="flex items-center" style={{ marginBottom: 4 }}>
                {/* Row label */}
                <div
                  className="text-xs font-medium text-right"
                  style={{ width: 86, paddingRight: 8, color: "#64748b" }}
                >
                  {l}
                </div>
                {/* Cells */}
                {[1, 2, 3, 4, 5].map((i) => {
                  const score = l * i;
                  const count = countAt(l, i);
                  const style = riskScoreStyle(score);
                  const isSelected = selected?.likelihood === l && selected?.impact === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(isSelected ? null : { likelihood: l, impact: i })}
                      style={{
                        width: 80,
                        height: 64,
                        background: isSelected ? style.color + "40" : style.bg,
                        border: `0.5px solid ${isSelected ? style.color : style.color + "50"}`,
                        borderRadius: 8,
                        marginRight: 4,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        transition: "background 0.15s",
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ color: style.color }}>
                        {score}
                      </span>
                      <span className="text-xs" style={{ color: style.color + "cc" }}>
                        {cellLabel(score)}
                      </span>
                      {count > 0 && (
                        <span
                          className="text-xs font-bold"
                          style={{
                            background: style.color,
                            color: "#0f1117",
                            borderRadius: 10,
                            minWidth: 18,
                            height: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Axis labels */}
            <div className="flex mt-3" style={{ marginLeft: 90 }}>
              <span className="text-xs" style={{ color: "#64748b" }}>← Low impact</span>
              <span className="flex-1" />
              <span className="text-xs" style={{ color: "#64748b" }}>High impact →</span>
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-4 flex-wrap" style={{ marginLeft: 90 }}>
              {[
                { label: "Low (1–7)", color: "#7dd3fc", bg: "#0f1f2a" },
                { label: "Medium (8–14)", color: "#86efac", bg: "#1f2a1a" },
                { label: "High (15–19)", color: "#fb923c", bg: "#2d1f0e" },
                { label: "Critical (20–25)", color: "#f87171", bg: "#3b1a1a" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.bg, border: `0.5px solid ${l.color}` }} />
                  <span className="text-xs" style={{ color: "#64748b" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected cell detail panel */}
          {selected && (
            <div style={{ minWidth: 340, maxWidth: 480, flex: 1 }}>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                    Likelihood {selected.likelihood} × Impact {selected.impact} = Score{" "}
                    <span style={{ color: riskScoreStyle(selected.likelihood * selected.impact).color }}>
                      {selected.likelihood * selected.impact}
                    </span>
                  </p>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs"
                    style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer" }}
                  >
                    ✕ Close
                  </button>
                </div>

                {selectedRisks.length === 0 ? (
                  <p className="text-sm" style={{ color: "#64748b" }}>No risks at this position.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedRisks.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between gap-3 py-2"
                        style={{ borderBottom: "0.5px solid #1e2433" }}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium truncate" style={{ color: "#f1f5f9" }}>{r.title}</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.vendor_name && (
                              <Link href={`/vendors/${r.vendor_id}`} className="text-xs hover:underline" style={{ color: "#818cf8" }}>
                                {r.vendor_name}
                              </Link>
                            )}
                            <span className="text-xs" style={{ color: "#64748b" }}>{r.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <RiskScoreBadge value={r.risk_score} />
                          <RiskStatusBadge value={r.status} />
                          <Link href={`/risks/${r.id}/edit`}>
                            <Button variant="secondary" size="sm">Edit</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Summary when nothing selected */}
          {!selected && risks.length > 0 && (
            <div style={{ minWidth: 200 }}>
              <Card>
                <p className="text-sm font-medium mb-3" style={{ color: "#f1f5f9" }}>Summary</p>
                {[
                  { label: "Critical (20–25)", min: 20, max: 25, color: "#f87171" },
                  { label: "High (15–19)", min: 15, max: 19, color: "#fb923c" },
                  { label: "Medium (8–14)", min: 8, max: 14, color: "#86efac" },
                  { label: "Low (1–7)", min: 1, max: 7, color: "#7dd3fc" },
                ].map((band) => {
                  const count = risks.filter((r) => r.risk_score >= band.min && r.risk_score <= band.max).length;
                  return (
                    <div key={band.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "0.5px solid #1e2433" }}>
                      <span className="text-xs" style={{ color: "#64748b" }}>{band.label}</span>
                      <span className="text-sm font-semibold" style={{ color: band.color }}>{count}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 mt-1">
                  <span className="text-xs font-medium" style={{ color: "#64748b" }}>Total</span>
                  <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{risks.length}</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
