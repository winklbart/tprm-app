"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import AssetForm from "@/components/AssetForm";
import { Topbar } from "@/components/ui/Topbar";
import { createAsset } from "@/lib/api";
import type { Asset } from "@/lib/types";

function NewAssetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const vendorId = params.get("vendor_id") ? Number(params.get("vendor_id")) : undefined;

  const handleSubmit = async (data: Omit<Asset, "id" | "created_at" | "updated_at">) => {
    const asset = await createAsset(data);
    if (vendorId) {
      router.push(`/vendors/${vendorId}`);
    } else {
      router.push(`/assets/${asset.id}/edit`);
    }
  };

  return (
    <AssetForm
      initial={vendorId ? { vendor_id: vendorId } : undefined}
      onSubmit={handleSubmit}
      submitLabel="Create Asset"
      vendorIdFixed={vendorId}
    />
  );
}

export default function NewAssetPage() {
  return (
    <div>
      <Topbar title="New Asset" />
      <Suspense fallback={<p className="text-sm" style={{ color: "#64748b" }}>Loading…</p>}>
        <NewAssetForm />
      </Suspense>
    </div>
  );
}
