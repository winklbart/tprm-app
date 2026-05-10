"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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
import type { AssessmentTemplateFilters } from "@/lib/api";
import type { AssessmentTemplate, AssessmentType, VendorCriticality } from "@/lib/types";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/types";

const LIMIT = 25;
const CRITICALITIES: VendorCriticality[] = ["Low", "Medium", "High", "Critical"];

const TABS: { key: AssessmentType; label: string }[] = [
  { key: "self_assessment", label: "Self Assessment" },
  { key: "trust_center", label: "Trust Center" },
  { key: "access_to_information", label: "Access to Information" },
  { key: "ai_check", label: "AI Check" },
];

// ── inline toggle ─────────────────────────────────────────────────────────────

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

// ── main content (needs useSearchParams — wrapped in Suspense) ─────────────────

function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = (searchParams.get("type") as AssessmentType | null) ?? "self_assessment";

  const [data, setData] = useState<{ items: AssessmentTemplate[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const deletedIds = useRef<Set<number>>(new Set());

  const [search, setSearch] = useState("");
  const [criticality, setCriticality] = useState<VendorCriticality | "">("");
  const [typeFilter, setTypeFilter] = useState<"" | "base" | "custom">("");
  const [offset, setOffset] = useState(0);

  const switchTab = (t: AssessmentType) => {
    setOffset(0);
    router.push(`/assessments/templates?type=${t}`, { scroll: false });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AssessmentTemplateFilters = { limit: LIMIT, offset, type: activeType };
      if (search) filters.search = search;
      if (criticality) filters.criticality = criticality;
      if (typeFilter === "base") filters.is_base_template = true;
      if (typeFilter === "custom") filters.is_base_template = false;
      const res = await getAssessmentTemplates(filters);
      const items = res.items.filter((item) => !deletedIds.current.has(item.id));
      setData({ items, total: res.total - (res.items.length - items.length) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [activeType, search, criticality, typeFilter, offset]);

  useEffect(() => { load(); }, [load]);

  // Reset offset when switching tabs
  useEffect(() => { setOffset(0); }, [activeType]);

  const handleToggleActive = async (t: AssessmentTemplate) => {
    const next = !t.is_active;
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item) => {
        if (item.id === t.id) return { ...item, is_active: next };
        // Mirror the backend's single-active enforcement: when activating, deactivate
        // other templates that share the same non-null criticality + type pair.
        if (next && t.criticality && item.criticality === t.criticality && item.type === t.type) {
          return { ...item, is_active: false };
        }
        return item;
      });
      return { ...prev, items };
    });
    try {
      await updateAssessmentTemplate(t.id, { is_active: next });
    } catch (e: unknown) {
      // Revert optimistic update
      setData((prev) => prev ? {
        ...prev,
        items: prev.items.map((item) => item.id === t.id ? { ...item, is_active: t.is_active } : item),
      } : prev);
      setError(e instanceof Error ? e.message : "Failed to update template");
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateAssessmentTemplate(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to duplicate template");
    }
  };

  const handleDelete = async (t: AssessmentTemplate) => {
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    setDeleting(t.id);
    setError(null);
    try {
      await deleteAssessmentTemplate(t.id);
      deletedIds.current.add(t.id);
      setData((prev) =>
        prev
          ? { items: prev.items.filter((item) => item.id !== t.id), total: prev.total - 1 }
          : prev,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete template");
    } finally {
      setDeleting(null);
    }
  };

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div>
      <Topbar
        title={`Assessment Templates${total ? ` (${total})` : ""}`}
        actions={
          <Link href={`/assessments/templates/new?type=${activeType}`}>
            <Button size="sm">+ New Template</Button>
          </Link>
        }
      />

      {/* Type tabs */}
      <div
        className="flex mb-4"
        style={{ borderBottom: "0.5px solid #1e2433" }}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeType;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: active ? "#818cf8" : "#64748b",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "#818cf8" : "transparent"}`,
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
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
          <p className="text-sm text-center py-8" style={{ color: "#64748b" }}>
            No {ASSESSMENT_TYPE_LABELS[activeType]} templates found.
          </p>
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
                          disabled={deleting === t.id}
                        >
                          {deleting === t.id ? "Deleting…" : "Delete"}
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

// ── page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div style={{ color: "#64748b", padding: 24, fontSize: 14 }}>Loading…</div>}>
      <TemplatesContent />
    </Suspense>
  );
}
