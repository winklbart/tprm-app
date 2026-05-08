"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AssessmentStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/ui/Topbar";
import { deleteAssessment, getAssessment, sendAssessment } from "@/lib/api";
import type { Assessment } from "@/lib/types";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/types";

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);

  useEffect(() => {
    getAssessment(Number(id))
      .then((a) => {
        setAssessment(a);
        if (a.public_token) setPublicLink(`/public/assessments/${a.public_token}`);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const handleSend = async () => {
    setSending(true);
    try {
      const updated = await sendAssessment(Number(id));
      setAssessment(updated);
      if (updated.public_token) setPublicLink(`/public/assessments/${updated.public_token}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this assessment? This cannot be undone.")) return;
    try {
      await deleteAssessment(Number(id));
      window.location.href = "/assessments";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (error) return <p className="text-sm mt-8 text-center" style={{ color: "#f87171" }}>{error}</p>;
  if (!assessment) return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;

  const questions = assessment.questions ?? [];
  const answers = assessment.answers ?? {};
  const canSend = assessment.status === "Draft" || assessment.status === "Sent";

  return (
    <div className="flex flex-col gap-4">
      <Topbar
        title={`Assessment #${assessment.id}`}
        actions={
          <>
            <Link href={`/assessments/${id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
            {canSend && (
              <Button size="sm" disabled={sending} onClick={handleSend}>
                {sending ? "Sending…" : assessment.public_token ? "Resend" : "Send to Vendor"}
              </Button>
            )}
            {assessment.status === "Completed" && (
              <a href={`/api/v1/assessments/${id}/export`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">Export PDF</Button>
              </a>
            )}
            <Button variant="secondary" size="sm" onClick={handleDelete} style={{ color: "#f87171" }}>
              Delete
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Detail label="Vendor" value={assessment.vendor_name ?? `Vendor #${assessment.vendor_id}`} />
          <Detail label="Type" value={ASSESSMENT_TYPE_LABELS[assessment.type] ?? assessment.type} />
          <Detail label="Status"><AssessmentStatusBadge value={assessment.status} /></Detail>
          <Detail label="Due Date" value={assessment.due_date ?? "—"} />
          <Detail label="Assigned To" value={assessment.assigned_to ?? "—"} />
          <Detail label="Completed" value={assessment.completed_at ? assessment.completed_at.slice(0, 10) : "—"} />
          {publicLink && (
            <div className="col-span-2">
              <Detail label="Vendor Link">
                <a href={publicLink} target="_blank" rel="noreferrer" style={{ color: "#818cf8", wordBreak: "break-all" }}>
                  {window.location.origin}{publicLink}
                </a>
              </Detail>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>
          Questions &amp; Answers
          <span className="ml-2 font-normal" style={{ color: "#64748b" }}>({questions.length})</span>
        </h2>
        {questions.length === 0 ? (
          <p className="text-sm" style={{ color: "#64748b" }}>No questions for this assessment type.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <div key={q.id}>
                <p className="text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>
                  {i + 1}. {q.question}
                </p>
                <p className="text-sm" style={{ color: answers[q.id] ? "#f1f5f9" : "#64748b" }}>
                  {answers[q.id] ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium mb-0.5" style={{ color: "#64748b" }}>{label}</div>
      <div style={{ color: "#f1f5f9" }}>{children ?? value}</div>
    </div>
  );
}
