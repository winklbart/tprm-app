"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import QuestionBuilder from "@/components/QuestionBuilder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, TextArea } from "@/components/ui/Input";
import { Topbar } from "@/components/ui/Topbar";
import { createAssessmentTemplate } from "@/lib/api";
import type { TemplateQuestionPayload } from "@/lib/api";
import type { VendorCriticality } from "@/lib/types";

const CRITICALITIES: VendorCriticality[] = ["Low", "Medium", "High", "Critical"];

export default function NewTemplatePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criticality, setCriticality] = useState<VendorCriticality | "">("");
  const [questions, setQuestions] = useState<TemplateQuestionPayload[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createAssessmentTemplate({
        name: name.trim(),
        description: description.trim() || null,
        criticality: criticality || null,
        questions,
      });
      router.push("/assessments/templates");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar title="New Assessment Template" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <p className="text-sm font-medium mb-4" style={{ color: "#f1f5f9" }}>Template Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Template name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SaaS Vendor Standard Assessment"
                required
              />
            </div>
            <div className="col-span-2">
              <TextArea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this template covers and when to use it…"
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
            {saving ? "Creating…" : "Create Template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
