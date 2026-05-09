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
} from "@/lib/api";
import type { AssessmentTemplate, VendorCriticality } from "@/lib/types";

const LIMIT = 25;
const CRITICALITIES: VendorCriticality[] = ["Low", "Medium", "High", "Critical"];

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

  const handleDuplicate = async (id: number) => {
    await duplicateAssessmentTemplate(id);
    load();
  };

  const handleDelete = async (t: AssessmentTemplate) => {
    if (t.is_base_template) return;
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
                {["Name", "Criticality", "Type", "Questions", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3 font-medium" style={{ color: "#f1f5f9" }}>{t.name}</td>
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
                    {t.is_active ? (
                      <span style={{ color: "#86efac", fontSize: 12 }}>Active</span>
                    ) : (
                      <span style={{ color: "#64748b", fontSize: 12 }}>Inactive</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1.5">
                      <Link href={`/assessments/templates/${t.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                      </Link>
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
