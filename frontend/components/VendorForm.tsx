"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea } from "@/components/ui/Input";
import type { Vendor, VendorCategory, VendorCriticality, VendorStatus } from "@/lib/types";

type FormData = Omit<Vendor, "id" | "risk_score" | "created_at" | "updated_at">;

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  submitLabel?: string;
}

const EMPTY: FormData = {
  name: "",
  criticality: "Low",
  status: "Active",
  category: "Other",
  country: "",
  website: "",
  primary_contact_name: "",
  primary_contact_email: "",
  notes: "",
};

export default function VendorForm({ initial, onSubmit, submitLabel = "Save" }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
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
        country: form.country || null,
        website: form.website || null,
        primary_contact_name: form.primary_contact_name || null,
        primary_contact_email: form.primary_contact_email || null,
        notes: form.notes || null,
      };
      await onSubmit(clean);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ maxWidth: 600 }}>
      <Input id="name" label="Name *" value={form.name} onChange={set("name")} error={errors.name} />

      <div className="grid grid-cols-2 gap-4">
        <Select id="criticality" label="Criticality *" value={form.criticality} onChange={set("criticality")}>
          {(["Low", "Medium", "High", "Critical"] as VendorCriticality[]).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </Select>
        <Select id="status" label="Status *" value={form.status} onChange={set("status")}>
          {(["Active", "Inactive", "Under Review", "Offboarded"] as VendorStatus[]).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </Select>
      </div>

      <Select id="category" label="Category *" value={form.category} onChange={set("category")}>
        {(["Cloud Provider", "Software Vendor", "Consultant", "Hardware", "Other"] as VendorCategory[]).map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input id="country" label="Country" value={form.country ?? ""} onChange={set("country")} />
        <Input id="website" label="Website" value={form.website ?? ""} onChange={set("website")} type="url" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input id="primary_contact_name" label="Contact Name" value={form.primary_contact_name ?? ""} onChange={set("primary_contact_name")} />
        <Input id="primary_contact_email" label="Contact Email" value={form.primary_contact_email ?? ""} onChange={set("primary_contact_email")} type="email" />
      </div>

      <TextArea id="notes" label="Notes" value={form.notes ?? ""} onChange={set("notes")} rows={3} />

      {submitError && <p className="text-sm" style={{ color: "#f87171" }}>{submitError}</p>}

      <div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
