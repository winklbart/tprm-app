"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Topbar } from "@/components/ui/Topbar";
import { getAssessment, updateAssessment } from "@/lib/api";
import type { Assessment, AssessmentStatus } from "@/lib/types";

const STATUSES: AssessmentStatus[] = ["Draft", "Sent", "In Progress", "Completed", "Overdue", "Closed"];

export default function EditAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [status, setStatus] = useState<AssessmentStatus>("Draft");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAssessment(Number(id)).then((a) => {
      setAssessment(a);
      setStatus(a.status);
      setDueDate(a.due_date ?? "");
      setAssignedTo(a.assigned_to ?? "");
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateAssessment(Number(id), {
        status,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
      });
      router.push(`/assessments/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  if (!assessment && !error) return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;
  if (error && !assessment) return <p className="text-sm mt-8 text-center" style={{ color: "#f87171" }}>{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <Topbar title={`Edit Assessment #${id}`} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ maxWidth: 600 }}>
        <Select id="status" label="Status" value={status} onChange={(e) => setStatus(e.target.value as AssessmentStatus)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-sm"
            style={{
              background: "#0f1117",
              border: "0.5px solid #1e2433",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#f1f5f9",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>Assigned To</label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Name or email"
            className="w-full text-sm"
            style={{
              background: "#0f1117",
              border: "0.5px solid #1e2433",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#f1f5f9",
              outline: "none",
            }}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

        <div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}
