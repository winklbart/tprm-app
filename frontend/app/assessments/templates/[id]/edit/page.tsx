"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import QuestionBuilder from "@/components/QuestionBuilder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, TextArea } from "@/components/ui/Input";
import { Topbar } from "@/components/ui/Topbar";
import {
  getAssessmentTemplate,
  replaceTemplateQuestions,
  updateAssessmentTemplate,
} from "@/lib/api";
import type { TemplateQuestionPayload } from "@/lib/api";
import type { AssessmentTemplateDetail, VendorCriticality } from "@/lib/types";

const CRITICALITIES: VendorCriticality[] = ["Low", "Medium", "High", "Critical"];

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<AssessmentTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState<VendorCriticality | "">("");
  const [questions, setQuestions] = useState<TemplateQuestionPayload[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAssessmentTemplate(Number(id))
      .then((t) => {
        setTemplate(t);
        setName(t.name);
        setDescription(t.description ?? "");
        setCriticality((t.criticality as VendorCriticality | null) ?? "");
        setQuestions(
          t.questions.map((q) => ({
            sort_order: q.sort_order,
            title: q.title,
            description: q.description,
            type: q.type,
            options: q.options,
            required: q.required,
          }))
        );
      })
      .catch(() => setError("Template not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateAssessmentTemplate(Number(id), {
        name: name.trim(),
        description: description.trim() || null,
        criticality: criticality || null,
      });
      await replaceTemplateQuestions(Number(id), questions);
      router.push("/assessments/templates");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Edit Template" />
        <p className="text-sm" style={{ color: "#64748b" }}>Loading…</p>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div>
        <Topbar title="Edit Template" />
        <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Topbar title={`Edit Template${template?.is_base_template ? " (Base)" : ""}`} />

      {template?.is_base_template && (
        <div
          className="mb-4 px-4 py-3 text-sm"
          style={{
            background: "#1e1b4b",
            border: "0.5px solid #818cf830",
            borderRadius: 8,
            color: "#818cf8",
          }}
        >
          This is a base template — changes will affect all future assessments that use this template.
          Duplicate it instead to create a custom version without modifying the base.
        </div>
      )}

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
