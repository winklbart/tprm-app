"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AssessmentStatusBadge, CriticalityBadge, RiskScoreBadge, RiskStatusBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/ui/Topbar";
import { getVendorProfile } from "@/lib/api";
import type { AssessmentStatus, RiskStatus, VendorProfile } from "@/lib/types";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/types";

export default function VendorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVendorProfile(Number(id))
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <p className="text-sm mt-8 text-center" style={{ color: "#f87171" }}>{error}</p>;
  if (!profile) return <p className="text-sm mt-8 text-center" style={{ color: "#64748b" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <Topbar
        title={profile.name}
        actions={
          <>
            <a href={`/api/v1/vendors/${id}/report`} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">Export Report</Button>
            </a>
            <Link href={`/vendors/${id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
            <Link href={`/assets/new?vendor_id=${id}`}>
              <Button size="sm">+ Add Asset</Button>
            </Link>
          </>
        }
      />

      {/* Details */}
      <Card>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Detail label="Criticality"><CriticalityBadge value={profile.criticality} /></Detail>
          <Detail label="Status"><StatusBadge value={profile.status} /></Detail>
          <Detail label="Category" value={profile.category} />
          <Detail label="Country" value={profile.country ?? "—"} />
          <Detail label="Website">
            {profile.website ? (
              <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>{profile.website}</a>
            ) : "—"}
          </Detail>
          <Detail label="Risk Score" value={profile.risk_score != null ? String(profile.risk_score.toFixed(0)) : "—"} />
          <Detail label="Contact Name" value={profile.primary_contact_name ?? "—"} />
          <Detail label="Contact Email" value={profile.primary_contact_email ?? "—"} />
          {profile.notes && (
            <div className="col-span-2">
              <Detail label="Notes" value={profile.notes} />
            </div>
          )}
        </div>
      </Card>

      {/* Assets */}
      <SectionCard
        title="Assets"
        count={profile.assets.length}
        action={<Link href={`/assets/new?vendor_id=${id}`}><Button size="sm">+ Add</Button></Link>}
      >
        {profile.assets.length === 0 ? (
          <Empty text="No assets yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Name", "Type", "Classification", "Owner", "License Expiry", ""].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.assets.map((a) => (
                <tr key={a.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3">{a.name}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.type}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.data_classification}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.owner ?? "—"}</td>
                  <td className="py-2 px-3" style={{ color: a.license_expiry && new Date(a.license_expiry) < new Date() ? "#f87171" : "#64748b" }}>
                    {a.license_expiry ?? "—"}
                  </td>
                  <td className="py-2 px-3">
                    <Link href={`/assets/${a.id}/edit`}>
                      <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Risks */}
      <SectionCard
        title="Risks"
        count={profile.risks.length}
        action={<Link href={`/risks/new?vendor_id=${id}`}><Button size="sm">+ Add Risk</Button></Link>}
      >
        {profile.risks.length === 0 ? (
          <Empty text="No risks linked." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Title", "Category", "Score", "Status", ""].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.risks.map((r) => (
                <tr key={r.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3" style={{ color: "#f1f5f9" }}>{r.title}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{r.category}</td>
                  <td className="py-2 px-3"><RiskScoreBadge value={r.risk_score} /></td>
                  <td className="py-2 px-3"><RiskStatusBadge value={r.status as RiskStatus} /></td>
                  <td className="py-2 px-3">
                    <Link href={`/risks/${r.id}/edit`}>
                      <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Assessments */}
      <SectionCard
        title="Assessments"
        count={profile.assessments.length}
        action={<Link href={`/assessments/new?vendor_id=${id}`}><Button size="sm">+ New Assessment</Button></Link>}
      >
        {profile.assessments.length === 0 ? (
          <Empty text="No assessments yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Type", "Status", "Due Date", ""].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.assessments.map((a) => (
                <tr key={a.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3">{ASSESSMENT_TYPE_LABELS[a.type as keyof typeof ASSESSMENT_TYPE_LABELS] ?? a.type}</td>
                  <td className="py-2 px-3"><AssessmentStatusBadge value={a.status as AssessmentStatus} /></td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.due_date ?? "—"}</td>
                  <td className="py-2 px-3">
                    <Link href={`/assessments/${a.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
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

function SectionCard({ title, count, action, children }: { title: string; count: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
          {title} <span style={{ color: "#64748b" }}>({count})</span>
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm py-4 text-center" style={{ color: "#64748b" }}>{text}</p>;
}
