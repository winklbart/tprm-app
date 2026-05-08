"use client";

import { useRouter } from "next/navigation";

import VendorForm from "@/components/VendorForm";
import { Topbar } from "@/components/ui/Topbar";
import { createVendor } from "@/lib/api";
import type { Vendor } from "@/lib/types";

export default function NewVendorPage() {
  const router = useRouter();

  const handleSubmit = async (data: Omit<Vendor, "id" | "risk_score" | "created_at" | "updated_at">) => {
    const vendor = await createVendor(data);
    router.push(`/vendors/${vendor.id}`);
  };

  return (
    <div>
      <Topbar title="New Vendor" />
      <VendorForm onSubmit={handleSubmit} submitLabel="Create Vendor" />
    </div>
  );
}
