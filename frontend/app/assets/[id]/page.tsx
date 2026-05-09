"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import SecurityIntelPanel from "@/components/SecurityIntelPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/ui/Topbar";
import { getAsset, getVendor } from "@/lib/api";
import type { Asset, Vendor } from "@/lib/types";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAsset(Number(id))
      .then(async (a) => {
        setAsset(a);
        try {
          const v = await getVendor(a.vendor_id);
          setVendor(v);
        } catch {
          // vendor info is optional
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <p className="text-sm mt-8 text-center" style={{ color: "#f87171" }}>{error}</p>;
  if (!asset) return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;

  const expired = asset.license_expiry && new Date(asset.license_expiry) < new Date();

  return (
    <div className="flex flex-col gap-4">
      <Topbar
        title={asset.name}
        actions={
          <>
            <Link href={`/assets/${id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
            {vendor && (
              <Link href={`/vendors/${vendor.id}`}>
                <Button variant="secondary" size="sm">View Vendor</Button>
              </Link>
            )}
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Detail label="Vendor" value={vendor?.name ?? `Vendor #${asset.vendor_id}`} />
          <Detail label="Type" value={asset.type} />
          <Detail label="Version" value={asset.version ?? "—"} />
          <Detail label="Classification" value={asset.data_classification} />
          <Detail label="Owner" value={asset.owner ?? "—"} />
          <Detail label="License Expiry">
            <span style={{ color: expired ? "#f87171" : "#f1f5f9" }}>
              {asset.license_expiry ?? "—"}
              {expired && " (expired)"}
            </span>
          </Detail>
          {asset.description && (
            <div className="col-span-2">
              <Detail label="Description" value={asset.description} />
            </div>
          )}
        </div>
      </Card>

      <SecurityIntelPanel assetId={asset.id} vendorId={asset.vendor_id} />
    </div>
  );
}

function Detail({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium mb-0.5" style={{ color: "#64748b" }}>{label}</div>
      <div style={{ color: "#f1f5f9" }}>{children ?? value}</div>
    </div>
  );
}
