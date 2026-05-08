"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import AssessmentForm from "@/components/AssessmentForm";
import { Topbar } from "@/components/ui/Topbar";
import { createAssessment } from "@/lib/api";
import type { AssessmentType } from "@/lib/types";

function NewAssessmentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const vendorId = params.get("vendor_id") ? Number(params.get("vendor_id")) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Topbar title="New Assessment" />
      <AssessmentForm
        initial={vendorId ? { vendor_id: vendorId } : undefined}
        vendorIdFixed={vendorId}
        submitLabel="Create Assessment"
        onSubmit={async (data) => {
          const a = await createAssessment(data as {
            vendor_id: number;
            type: AssessmentType;
            asset_id: number | null;
            due_date: string | null;
            assigned_to: string | null;
          });
          router.push(`/assessments/${a.id}`);
        }}
      />
    </div>
  );
}

export default function NewAssessmentPage() {
  return (
    <Suspense>
      <NewAssessmentInner />
    </Suspense>
  );
}
