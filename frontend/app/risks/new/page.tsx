"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import RiskForm from "@/components/RiskForm";
import { Topbar } from "@/components/ui/Topbar";
import { createRisk } from "@/lib/api";
import type { Risk, RiskCategory } from "@/lib/types";

const VALID_CATEGORIES: RiskCategory[] = ["Data Privacy", "Operational", "Financial", "Compliance", "Reputational"];

function NewRiskInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const vendorId = searchParams.get("vendor_id") ? Number(searchParams.get("vendor_id")) : undefined;
  const assetId = searchParams.get("asset_id") ? Number(searchParams.get("asset_id")) : undefined;
  const title = searchParams.get("title") ?? undefined;
  const description = searchParams.get("description") ?? undefined;
  const rawCategory = searchParams.get("category");
  const category: RiskCategory | undefined =
    rawCategory && VALID_CATEGORIES.includes(rawCategory as RiskCategory)
      ? (rawCategory as RiskCategory)
      : undefined;
  const likelihood = searchParams.get("likelihood") ? Number(searchParams.get("likelihood")) : undefined;
  const impact = searchParams.get("impact") ? Number(searchParams.get("impact")) : undefined;

  const initial: Partial<Omit<Risk, "id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">> = {
    ...(vendorId != null && { vendor_id: vendorId }),
    ...(assetId != null && { asset_id: assetId }),
    ...(title && { title }),
    ...(description && { description }),
    ...(category && { category }),
    ...(likelihood != null && { likelihood }),
    ...(impact != null && { impact }),
  };

  const handleSubmit = async (data: Omit<Risk, "id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">) => {
    await createRisk(data);
    router.push("/risks");
  };

  return (
    <div>
      <Topbar title="New Risk" />
      <RiskForm
        initial={Object.keys(initial).length > 0 ? initial : undefined}
        onSubmit={handleSubmit}
        submitLabel="Create Risk"
        vendorIdFixed={vendorId}
      />
    </div>
  );
}

export default function NewRiskPage() {
  return (
    <Suspense>
      <NewRiskInner />
    </Suspense>
  );
}
