"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import RiskForm from "@/components/RiskForm";
import { Topbar } from "@/components/ui/Topbar";
import { createRisk } from "@/lib/api";
import type { Risk } from "@/lib/types";

function NewRiskInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendor_id") ? Number(searchParams.get("vendor_id")) : undefined;

  const handleSubmit = async (data: Omit<Risk, "id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">) => {
    await createRisk(data);
    router.push("/risks");
  };

  return (
    <div>
      <Topbar title="New Risk" />
      <RiskForm
        initial={vendorId ? { vendor_id: vendorId } : undefined}
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
