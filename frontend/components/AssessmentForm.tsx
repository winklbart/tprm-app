"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import VendorCombobox from "@/components/VendorCombobox";
import type { AssessmentType } from "@/lib/types";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/types";

interface FormData {
  vendor_id: number;
  type: AssessmentType;
  asset_id: number | null;
  due_date: string;
  assigned_to: string;
}

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: {
    vendor_id: number;
    type: AssessmentType;
    asset_id: number | null;
    due_date: string | null;
    assigned_to: string | null;
  }) => Promise<void>;
  submitLabel?: string;
  vendorIdFixed?: number;
}

const EMPTY: FormData = {
  vendor_id: 0,
  type: "self_assessment",
  asset_id: null,
  due_date: "",
  assigned_to: "",
};

const TYPES: AssessmentType[] = ["self_assessment", "trust_center", "access_to_information", "ai_check"];

export default function AssessmentForm({ initial, onSubmit, submitLabel = "Save", vendorIdFixed }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.vendor_id) errs.vendor_id = "Vendor is required";
    if (!form.type) errs.type = "Type is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        vendor_id: Number(form.vendor_id),
        type: form.type,
        asset_id: form.asset_id ? Number(form.asset_id) : null,
        due_date: form.due_date || null,
        assigned_to: form.assigned_to || null,
      });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ maxWidth: 600 }}>
      {vendorIdFixed == null && (
        <VendorCombobox
          value={form.vendor_id || null}
          onChange={(id) => setForm((f) => ({ ...f, vendor_id: id }))}
          error={errors.vendor_id}
        />
      )}

      <Select id="type" label="Assessment Type *" value={form.type} onChange={set("type")} error={errors.type}>
        {TYPES.map((t) => (
          <option key={t} value={t}>{ASSESSMENT_TYPE_LABELS[t]}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input id="due_date" label="Due Date" type="date" value={form.due_date} onChange={set("due_date")} />
        <Input id="assigned_to" label="Assigned To" value={form.assigned_to} onChange={set("assigned_to")} placeholder="Name or email" />
      </div>

      {submitError && <p className="text-sm" style={{ color: "#f87171" }}>{submitError}</p>}

      <div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
