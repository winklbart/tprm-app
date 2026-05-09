"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { RiskScoreBadge, RiskStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Topbar } from "@/components/ui/Topbar";
import { deleteRisk, getRisks } from "@/lib/api";
import type { PaginatedResponse, Risk, RiskCategory, RiskStatus } from "@/lib/types";

const LIMIT = 25;

export default function RisksPage() {
  const [data, setData] = useState<PaginatedResponse<Risk> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RiskStatus | "">("");
  const [category, setCategory] = useState<RiskCategory | "">("");
  const [offset, setOffset] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const res = await getRisks({
        search: search || undefined,
        status: (status as RiskStatus) || undefined,
        category: (category as RiskCategory) || undefined,
        limit: LIMIT,
        offset,
      });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load risks");
    } finally {
      setLoading(false);
    }
  }, [search, status, category, offset]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete risk "${title}"? This cannot be undone.`)) return;
    await deleteRisk(id);
    load();
  };

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((r) => selectedIds.has(r.id));
  const someSelected = items.some((r) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((r) => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} selected risk(s)? This cannot be undone.`)) return;
    await Promise.all([...selectedIds].map((id) => deleteRisk(id)));
    load();
  };

  return (
    <div>
      <Topbar
        title="Risk Register"
        actions={
          <>
            <Link href="/risks/heatmap">
              <Button variant="secondary" size="sm">Heatmap</Button>
            </Link>
            <Link href="/risks/new">
              <Button size="sm">+ Add Risk</Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search title, description…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          onClear={() => { setSearch(""); setOffset(0); }}
          style={{ width: 240 }}
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as RiskStatus | ""); setOffset(0); }} style={{ width: 160 }}>
          <option value="">All statuses</option>
          {(["Open", "In Mitigation", "Accepted", "Closed"] as RiskStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => { setCategory(e.target.value as RiskCategory | ""); setOffset(0); }} style={{ width: 175 }}>
          <option value="">All categories</option>
          {(["Data Privacy", "Operational", "Financial", "Compliance", "Reputational"] as RiskCategory[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between mb-4"
          style={{ background: "#131720", border: "0.5px solid #1e2433", borderRadius: 10, padding: "10px 16px" }}
        >
          <span className="text-sm" style={{ color: "#f1f5f9" }}>
            {selectedIds.size} risk{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <Card>
        {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>No risks found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                <th className="py-2 px-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={handleSelectAll}
                    style={{ accentColor: "#4f46e5", cursor: "pointer" }}
                  />
                </th>
                {["Title", "Vendor", "Category", "Likelihood", "Impact", "Score", "Status", "Owner", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => handleToggle(r.id)}
                      style={{ accentColor: "#4f46e5", cursor: "pointer" }}
                    />
                  </td>
                  <td className="py-2 px-3 font-medium" style={{ color: "#f1f5f9" }}>{r.title}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>
                    {r.vendor_name ? (
                      <Link href={`/vendors/${r.vendor_id}`} className="hover:underline" style={{ color: "#818cf8" }}>
                        {r.vendor_name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{r.category}</td>
                  <td className="py-2 px-3 text-center" style={{ color: "#f1f5f9" }}>{r.likelihood}</td>
                  <td className="py-2 px-3 text-center" style={{ color: "#f1f5f9" }}>{r.impact}</td>
                  <td className="py-2 px-3"><RiskScoreBadge value={r.risk_score} /></td>
                  <td className="py-2 px-3"><RiskStatusBadge value={r.status} /></td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{r.owner ?? "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <Link href={`/risks/${r.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                      </Link>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(r.id, r.title)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
        )}
      </Card>
    </div>
  );
}
