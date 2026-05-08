"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select, TextArea } from "@/components/ui/Input";
import VendorCombobox from "@/components/VendorCombobox";
import type { Asset, AssetType, DataClassification } from "@/lib/types";

type FormData = Omit<Asset, "id" | "created_at" | "updated_at">;

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  submitLabel?: string;
  vendorIdFixed?: number;
}

const EMPTY: FormData = {
  vendor_id: 0,
  name: "",
  type: "Software",
  version: "",
  description: "",
  owner: "",
  license_expiry: null,
  data_classification: "Internal",
};

export default function AssetForm({ initial, onSubmit, submitLabel = "Save", vendorIdFixed }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.vendor_id) errs.vendor_id = "Vendor ID is required";
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
        version: form.version || null,
        description: form.description || null,
        owner: form.owner || null,
        license_expiry: form.license_expiry || null,
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
      {vendorIdFixed == null && (
        <VendorCombobox
          value={form.vendor_id || null}
          onChange={(id) => setForm((f) => ({ ...f, vendor_id: id }))}
          error={errors.vendor_id}
        />
      )}

      <Input id="name" label="Name *" value={form.name} onChange={set("name")} error={errors.name} />

      <div className="grid grid-cols-2 gap-4">
        <Select id="type" label="Type *" value={form.type} onChange={set("type")}>
          {(["Software", "SaaS", "API", "On-Premise", "Hardware"] as AssetType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select id="data_classification" label="Data Classification *" value={form.data_classification} onChange={set("data_classification")}>
          {(["Public", "Internal", "Confidential", "Restricted"] as DataClassification[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input id="version" label="Version" value={form.version ?? ""} onChange={set("version")} />
        <Input id="owner" label="Owner" value={form.owner ?? ""} onChange={set("owner")} />
      </div>

      <Input
        id="license_expiry"
        label="License Expiry"
        type="date"
        value={form.license_expiry ?? ""}
        onChange={set("license_expiry")}
      />

      <TextArea id="description" label="Description" value={form.description ?? ""} onChange={set("description")} rows={3} />

      {submitError && <p className="text-sm" style={{ color: "#f87171" }}>{submitError}</p>}

      <div>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}
