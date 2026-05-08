"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import VendorForm from "@/components/VendorForm";
import { Topbar } from "@/components/ui/Topbar";
import { getVendor, updateVendor } from "@/lib/api";
import type { Vendor } from "@/lib/types";

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    getVendor(Number(id)).then(setVendor);
  }, [id]);

  const handleSubmit = async (data: Omit<Vendor, "id" | "risk_score" | "created_at" | "updated_at">) => {
    await updateVendor(Number(id), data);
    router.push(`/vendors/${id}`);
  };

  if (!vendor) {
    return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;
  }

  return (
    <div>
      <Topbar title={`Edit: ${vendor.name}`} />
      <VendorForm initial={vendor} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
