"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AssetForm from "@/components/AssetForm";
import { Topbar } from "@/components/ui/Topbar";
import { getAsset, updateAsset } from "@/lib/api";
import type { Asset } from "@/lib/types";

export default function EditAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);

  useEffect(() => {
    getAsset(Number(id)).then(setAsset);
  }, [id]);

  const handleSubmit = async (data: Omit<Asset, "id" | "created_at" | "updated_at">) => {
    await updateAsset(Number(id), data);
    router.push(`/vendors/${data.vendor_id}`);
  };

  if (!asset) {
    return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;
  }

  return (
    <div>
      <Topbar title={`Edit Asset: ${asset.name}`} />
      <AssetForm
        initial={asset}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        vendorIdFixed={asset.vendor_id}
      />
    </div>
  );
}
