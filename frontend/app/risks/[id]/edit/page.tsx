"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import RiskForm from "@/components/RiskForm";
import { Topbar } from "@/components/ui/Topbar";
import { getRisk, updateRisk } from "@/lib/api";
import type { Risk } from "@/lib/types";

export default function EditRiskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [risk, setRisk] = useState<Risk | null>(null);

  useEffect(() => {
    getRisk(Number(id)).then(setRisk);
  }, [id]);

  const handleSubmit = async (data: Omit<Risk, "id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">) => {
    await updateRisk(Number(id), data);
    router.push("/risks");
  };

  if (!risk) {
    return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;
  }

  return (
    <div>
      <Topbar title={`Edit: ${risk.title}`} />
      <RiskForm initial={risk} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
