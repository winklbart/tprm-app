"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getPublicAssessment, submitPublicAssessment } from "@/lib/api";
import type { Assessment, Question } from "@/lib/types";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/types";

export default function PublicAssessmentPage() {
  const { token } = useParams<{ token: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getPublicAssessment(token)
      .then((a) => {
        setAssessment(a);
        if (a.status === "Completed") setSubmitted(true);
        const initial: Record<string, string> = {};
        for (const q of (a.questions ?? [])) {
          initial[q.id] = a.answers?.[q.id] ?? "";
        }
        setAnswers(initial);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Assessment not found"));
  }, [token]);

  const handleChange = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicAssessment(token, answers);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div style={centerStyle}>
        <div style={cardStyle}>
          <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div style={centerStyle}>
        <p style={{ color: "#64748b", fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={centerStyle}>
        <div style={cardStyle}>
          <h1 style={headingStyle}>Assessment Submitted</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
            Thank you for completing the security assessment for{" "}
            <strong style={{ color: "#f1f5f9" }}>{assessment.vendor_name}</strong>.
            Your responses have been recorded.
          </p>
        </div>
      </div>
    );
  }

  const questions: Question[] = assessment.questions ?? [];
  const typeLabel = ASSESSMENT_TYPE_LABELS[assessment.type] ?? assessment.type;

  return (
    <div style={centerStyle}>
      <div style={{ ...cardStyle, maxWidth: 720 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={headingStyle}>Security Assessment</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            {assessment.vendor_name} · {typeLabel}
            {assessment.due_date && ` · Due ${assessment.due_date}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {questions.map((q, i) => (
            <div key={q.id}>
              <label style={questionStyle}>
                {i + 1}. {q.question}
              </label>
              {q.type === "yesno" ? (
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#94a3b8", fontSize: 14 }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleChange(q.id, opt)}
                        style={{ accentColor: "#818cf8" }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : q.type === "multiline" ? (
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  rows={4}
                  style={inputStyle}
                />
              ) : (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}

          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}

          <div>
            <button type="submit" disabled={submitting} style={submitBtnStyle}>
              {submitting ? "Submitting…" : "Submit Assessment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0d14",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "48px 24px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f1117",
  border: "0.5px solid #1e2433",
  borderRadius: 12,
  padding: "32px 40px",
};

const headingStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#f1f5f9",
  margin: 0,
};

const questionStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 500,
  color: "#cbd5e1",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0a0d14",
  border: "0.5px solid #1e2433",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  resize: "vertical" as const,
  boxSizing: "border-box",
};

const submitBtnStyle: React.CSSProperties = {
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
