"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CriticalityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Topbar } from "@/components/ui/Topbar";
import {
  deleteAssessmentTemplate,
  duplicateAssessmentTemplate,
  getAssessmentTemplates,
  updateAssessmentTemplate,
} from "@/lib/api";
import type { AssessmentTemplate, VendorCriticality } from "@/lib/types";

const LIMIT = 25;
const CRITICALITIES: VendorCriticality[] = ["Low", "Medium", "High", "Critical"];

// ── inline toggle ────────────────────────────────────────────────────────────

function ActiveToggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      title={active ? "Click to deactivate" : "Click to activate"}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: active ? "#4f46e5" : "#1e2433",
        border: `0.5px solid ${active ? "#4f46e5" : "#64748b"}`,
        cursor: "pointer",
        position: "relative",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: active ? 17 : 3,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#f1f5f9",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [data, setData] = useState<{ items: AssessmentTemplate[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [criticality, setCriticality] = useState<VendorCriticality | "">("");
  const [typeFilter, setTypeFilter] = useState<"" | "base" | "custom">("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, unknown> = { limit: LIMIT, offset };
      if (search) filters.search = search;
      if (criticality) filters.criticality = criticality;
      if (typeFilter === "base") filters.is_base_template = true;
      if (typeFilter === "custom") filters.is_base_template = false;
      const res = await getAssessmentTemplates(filters);
      setData({ items: res.items, total: res.total });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, criticality, typeFilter, offset]);

  useEffect(() => { load(); }, [load]);

  // Optimistic toggle. Toggling OFF: update single item, no reload needed.
  // Toggling ON: after API success, reload the full list so deactivated siblings
  // (same criticality, now is_active=false) are reflected immediately.
  const handleToggleActive = async (t: AssessmentTemplate) => {
    const next = !t.is_active;
    setData((prev) => prev ? {
      ...prev,
      items: prev.items.map((item) => item.id === t.id ? { ...item, is_active: next } : item),
    } : prev);
    try {
      await updateAssessmentTemplate(t.id, { is_active: next });
      if (next) {
        // Activation may have deactivated other templates with the same criticality
        load();
      }
    } catch {
      setData((prev) => prev ? {
        ...prev,
        items: prev.items.map((item) => item.id === t.id ? { ...item, is_active: t.is_active } : item),
      } : prev);
    }
  };

  const handleDuplicate = async (id: number) => {
    await duplicateAssessmentTemplate(id);
    load();
  };

  const handleDelete = async (t: AssessmentTemplate) => {
    if (!confirm(`Deactivate template "${t.name}"? It will no longer appear by default.`)) return;
    try {
      await deleteAssessmentTemplate(t.id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div>
      <Topbar
        title={`Assessment Templates${total ? ` (${total})` : ""}`}
        actions={
          <Link href="/assessments/templates/new">
            <Button size="sm">+ New Template</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          onClear={() => { setSearch(""); setOffset(0); }}
          style={{ width: 220 }}
        />
        <Select
          value={criticality}
          onChange={(e) => { setCriticality(e.target.value as VendorCriticality | ""); setOffset(0); }}
          style={{ width: 160 }}
        >
          <option value="">All criticalities</option>
          {CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as "" | "base" | "custom"); setOffset(0); }}
          style={{ width: 150 }}
        >
          <option value="">All types</option>
          <option value="base">Base templates</option>
          <option value="custom">Custom templates</option>
        </Select>
      </div>

      <Card>
        {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}
        {loading ? (
          <p className="text-sm text-center py-8" style={{ color: "#64748b" }}>Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "#64748b" }}>No templates found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Name", "Criticality", "Type", "Questions", "Active", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3 font-medium" style={{ color: "#f1f5f9" }}>
                    <span>{t.name}</span>
                    {t.is_active && t.criticality && (
                      <span
                        className="ml-2 text-xs font-normal px-1.5 py-0.5"
                        style={{
                          borderRadius: 6,
                          color: "#86efac",
                          background: "#1f2a1a",
                          border: "0.5px solid #86efac30",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Active for {t.criticality}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {t.criticality ? (
                      <CriticalityBadge value={t.criticality} />
                    ) : (
                      <span style={{ color: "#64748b" }}>All</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {t.is_base_template ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                        style={{ borderRadius: 8, color: "#818cf8", background: "#1e1b4b", border: "0.5px solid #818cf830" }}
                      >
                        Base
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                        style={{ borderRadius: 8, color: "#94a3b8", background: "#1e2433", border: "0.5px solid #1e2433" }}
                      >
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3" style={{ color: "#94a3b8" }}>{t.question_count}</td>
                  <td className="py-2 px-3">
                    <ActiveToggle active={t.is_active} onChange={() => handleToggleActive(t)} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1.5">
                      {t.is_base_template ? (
                        <Link href={`/assessments/templates/${t.id}/edit`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                      ) : (
                        <Link href={`/assessments/templates/${t.id}/edit`}>
                          <Button variant="secondary" size="sm">Edit</Button>
                        </Link>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDuplicate(t.id)}
                      >
                        Duplicate
                      </Button>
                      {!t.is_base_template && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(t)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {total > LIMIT && (
        <Pagination
          total={total}
          limit={LIMIT}
          offset={offset}
          onChange={setOffset}
        />
      )}
    </div>
  );
}
