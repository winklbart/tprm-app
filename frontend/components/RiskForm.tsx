"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea } from "@/components/ui/Input";
import VendorCombobox from "@/components/VendorCombobox";
import type { Risk, RiskCategory, RiskStatus } from "@/lib/types";

type FormData = Omit<Risk, "id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">;

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  submitLabel?: string;
  vendorIdFixed?: number;
}

const EMPTY: FormData = {
  vendor_id: 0,
  asset_id: null,
  assessment_id: null,
  title: "",
  description: "",
  category: "Operational",
  likelihood: 3,
  impact: 3,
  mitigation_plan: "",
  owner: "",
  status: "Open",
};

export default function RiskForm({ initial, onSubmit, submitLabel = "Save", vendorIdFixed }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.vendor_id) errs.vendor_id = "Vendor is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const clean: FormData = {
        ...form,
        vendor_id: Number(form.vendor_id),
        likelihood: Number(form.likelihood),
        impact: Number(form.impact),
        description: form.description || null,
        mitigation_plan: form.mitigation_plan || null,
        owner: form.owner || null,
      };
      await onSubmit(clean);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const previewScore = Number(form.likelihood) * Number(form.impact);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ maxWidth: 600 }}>
      {vendorIdFixed == null && (
        <VendorCombobox
          value={form.vendor_id || null}
          onChange={(id) => setForm((f) => ({ ...f, vendor_id: id }))}
          error={errors.vendor_id}
        />
      )}

      <Input id="title" label="Title *" value={form.title} onChange={set("title")} error={errors.title} />

      <Select id="category" label="Category *" value={form.category} onChange={set("category")}>
        {(["Data Privacy", "Operational", "Financial", "Compliance", "Reputational"] as RiskCategory[]).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>

      <div className="grid grid-cols-3 gap-4">
        <Select id="likelihood" label="Likelihood (1–5) *" value={String(form.likelihood)} onChange={set("likelihood")}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Select id="impact" label="Impact (1–5) *" value={String(form.impact)} onChange={set("impact")}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#64748b" }}>Risk Score</label>
          <div
            className="flex items-center justify-center text-sm font-semibold"
            style={{
              background: "#0f1117",
              border: "0.5px solid #1e2433",
              borderRadius: 8,
              padding: "8px 12px",
              color: previewScore >= 20 ? "#f87171" : previewScore >= 15 ? "#fb923c" : previewScore >= 8 ? "#86efac" : "#7dd3fc",
            }}
          >
            {previewScore}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select id="status" label="Status *" value={form.status} onChange={set("status")}>
          {(["Open", "In Mitigation", "Accepted", "Closed"] as RiskStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Input id="owner" label="Owner" value={form.owner ?? ""} onChange={set("owner")} />
      </div>

      <TextArea id="description" label="Description" value={form.description ?? ""} onChange={set("description")} rows={3} />
      <TextArea id="mitigation_plan" label="Mitigation Plan" value={form.mitigation_plan ?? ""} onChange={set("mitigation_plan")} rows={3} />

      {submitError && <p className="text-sm" style={{ color: "#f87171" }}>{submitError}</p>}

      <div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
