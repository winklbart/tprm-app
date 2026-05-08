"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AssessmentStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Topbar } from "@/components/ui/Topbar";
import { getAssessments } from "@/lib/api";
import type { Assessment, AssessmentStatus, AssessmentType } from "@/lib/types";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/types";

const STATUSES: AssessmentStatus[] = ["Draft", "Sent", "In Progress", "Completed", "Overdue", "Closed"];
const TYPES: AssessmentType[] = ["self_assessment", "ai_check", "trust_center", "access_to_information"];

export default function AssessmentsPage() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<AssessmentType | "">("");
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAssessments({
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      limit: 50,
    })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [typeFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <Topbar
        title={`Assessments${total ? ` (${total})` : ""}`}
        actions={
          <Link href="/assessments/new">
            <Button size="sm">+ New Assessment</Button>
          </Link>
        }
      />

      <div className="flex gap-3">
        <Select id="type-filter" label="" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssessmentType | "")}>
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{ASSESSMENT_TYPE_LABELS[t]}</option>)}
        </Select>
        <Select id="status-filter" label="" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssessmentStatus | "")}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

      <div style={{ border: "0.5px solid #1e2433", borderRadius: 12, overflow: "hidden" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "0.5px solid #1e2433", background: "#0f1117" }}>
              {["Vendor", "Type", "Status", "Due Date", "Assigned To", ""].map((h) => (
                <th key={h} className="text-left py-2 px-4 font-medium" style={{ color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm" style={{ color: "#64748b" }}>
                  No assessments found.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-4" style={{ color: "#f1f5f9" }}>
                    {a.vendor_name ?? `Vendor #${a.vendor_id}`}
                  </td>
                  <td className="py-2 px-4" style={{ color: "#94a3b8" }}>
                    {ASSESSMENT_TYPE_LABELS[a.type] ?? a.type}
                  </td>
                  <td className="py-2 px-4">
                    <AssessmentStatusBadge value={a.status} />
                  </td>
                  <td className="py-2 px-4" style={{ color: "#64748b" }}>{a.due_date ?? "—"}</td>
                  <td className="py-2 px-4" style={{ color: "#64748b" }}>{a.assigned_to ?? "—"}</td>
                  <td className="py-2 px-4">
                    <Link href={`/assessments/${a.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
