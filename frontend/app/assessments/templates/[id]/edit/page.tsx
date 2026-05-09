"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import QuestionBuilder from "@/components/QuestionBuilder";
import { CriticalityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, TextArea } from "@/components/ui/Input";
import { Topbar } from "@/components/ui/Topbar";
import {
  duplicateAssessmentTemplate,
  getAssessmentTemplate,
  replaceTemplateQuestions,
  updateAssessmentTemplate,
} from "@/lib/api";
import type { TemplateQuestionPayload } from "@/lib/api";
import type { AssessmentTemplateDetail, VendorCriticality } from "@/lib/types";
import { QUESTION_TYPE_ICONS, QUESTION_TYPE_LABELS } from "@/lib/types";

const CRITICALITIES: VendorCriticality[] = ["Low", "Medium", "High", "Critical"];

// ── base template read-only view ─────────────────────────────────────────────

function BaseTemplateView({ template, onDuplicate }: { template: AssessmentTemplateDetail; onDuplicate: () => void }) {
  const router = useRouter();

  return (
    <div>
      <Topbar
        title={template.name}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/assessments/templates")}>
              Back
            </Button>
            <Button size="sm" onClick={onDuplicate}>
              Duplicate
            </Button>
          </div>
        }
      />

      <div
        className="mb-4 flex items-start gap-3 px-4 py-3 text-sm"
        style={{
          background: "#1e1b4b",
          border: "0.5px solid #818cf850",
          borderRadius: 8,
          color: "#818cf8",
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>ⓘ</span>
        <span>
          This is a base template and cannot be edited or deleted.
          Use <strong>Duplicate</strong> to create a customizable copy.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-xs font-medium mb-3" style={{ color: "#64748b" }}>Template Details</p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#64748b" }}>Name</p>
              <p style={{ color: "#f1f5f9" }}>{template.name}</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#64748b" }}>Criticality</p>
              {template.criticality ? (
                <CriticalityBadge value={template.criticality} />
              ) : (
                <span style={{ color: "#64748b" }}>All vendors</span>
              )}
            </div>
            {template.description && (
              <div className="col-span-2">
                <p className="text-xs mb-0.5" style={{ color: "#64748b" }}>Description</p>
                <p style={{ color: "#94a3b8" }}>{template.description}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-medium mb-3" style={{ color: "#64748b" }}>
            Questions ({template.questions.length})
          </p>
          <div className="flex flex-col gap-2">
            {template.questions.map((q, i) => (
              <div
                key={q.id}
                style={{
                  background: "#0f1117",
                  border: "0.5px solid #1e2433",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span className="text-xs font-mono" style={{ color: "#64748b", minWidth: 20 }}>
                  {i + 1}.
                </span>
                <span style={{ color: "#64748b", fontSize: 16, minWidth: 18 }}>
                  {QUESTION_TYPE_ICONS[q.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "#f1f5f9" }}>{q.title}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    {QUESTION_TYPE_LABELS[q.type]}
                    {q.required && (
                      <span style={{ color: "#f87171", marginLeft: 6 }}>required</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── custom template edit form ─────────────────────────────────────────────────

function CustomTemplateEdit({ template }: { template: AssessmentTemplateDetail }) {
  const router = useRouter();

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [criticality, setCriticality] = useState<VendorCriticality | "">((template.criticality as VendorCriticality | null) ?? "");
  const [questions, setQuestions] = useState<TemplateQuestionPayload[]>(
    template.questions.map((q) => ({
      sort_order: q.sort_order,
      title: q.title,
      description: q.description,
      type: q.type,
      options: q.options,
      required: q.required,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateAssessmentTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        criticality: criticality || null,
      });
      await replaceTemplateQuestions(template.id, questions);
      router.push("/assessments/templates");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar title="Edit Template" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <p className="text-sm font-medium mb-4" style={{ color: "#f1f5f9" }}>Template Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Template name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <TextArea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 72 }}
              />
            </div>
            <Select
              label="Criticality (optional)"
              value={criticality}
              onChange={(e) => setCriticality(e.target.value as VendorCriticality | "")}
            >
              <option value="">Applies to all vendors</option>
              {CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
              Questions <span style={{ color: "#64748b" }}>({questions.length})</span>
            </p>
          </div>
          <QuestionBuilder questions={questions} onChange={setQuestions} />
        </Card>

        {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.push("/assessments/templates")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── page router ───────────────────────────────────────────────────────────────

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<AssessmentTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getAssessmentTemplate(Number(id))
      .then(setTemplate)
      .catch(() => setLoadError("Template not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDuplicate = async () => {
    if (!template) return;
    const copy = await duplicateAssessmentTemplate(template.id);
    router.push(`/assessments/templates/${copy.id}/edit`);
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Template" />
        <p className="text-sm" style={{ color: "#64748b" }}>Loading…</p>
      </div>
    );
  }

  if (loadError || !template) {
    return (
      <div>
        <Topbar title="Template" />
        <p className="text-sm" style={{ color: "#f87171" }}>{loadError ?? "Template not found"}</p>
      </div>
    );
  }

  if (template.is_base_template) {
    return <BaseTemplateView template={template} onDuplicate={handleDuplicate} />;
  }

  return <CustomTemplateEdit template={template} />;
}
