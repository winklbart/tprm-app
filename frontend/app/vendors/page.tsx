"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CriticalityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Topbar } from "@/components/ui/Topbar";
import { deleteVendor, getVendors } from "@/lib/api";
import type { PaginatedResponse, Vendor, VendorCategory, VendorCriticality, VendorStatus } from "@/lib/types";

const LIMIT = 25;

export default function VendorsPage() {
  const [data, setData] = useState<PaginatedResponse<Vendor> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [criticality, setCriticality] = useState<VendorCriticality | "">("");
  const [status, setStatus] = useState<VendorStatus | "">("");
  const [category, setCategory] = useState<VendorCategory | "">("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVendors({
        search: search || undefined,
        criticality: (criticality as VendorCriticality) || undefined,
        status: (status as VendorStatus) || undefined,
        category: (category as VendorCategory) || undefined,
        limit: LIMIT,
        offset,
      });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [search, criticality, status, category, offset]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete vendor "${name}"? This cannot be undone.`)) return;
    await deleteVendor(id);
    load();
  };

  return (
    <div>
      <Topbar
        title="Vendors"
        actions={
          <>
            <Link href="/vendors/import">
              <Button variant="secondary" size="sm">Import CSV</Button>
            </Link>
            <Link href="/vendors/new">
              <Button size="sm">+ Add Vendor</Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search name, email, country…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          style={{ width: 240 }}
        />
        <Select value={criticality} onChange={(e) => { setCriticality(e.target.value as VendorCriticality | ""); setOffset(0); }} style={{ width: 150 }}>
          <option value="">All criticalities</option>
          {(["Low", "Medium", "High", "Critical"] as VendorCriticality[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value as VendorStatus | ""); setOffset(0); }} style={{ width: 150 }}>
          <option value="">All statuses</option>
          {(["Active", "Inactive", "Under Review", "Offboarded"] as VendorStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={category} onChange={(e) => { setCategory(e.target.value as VendorCategory | ""); setOffset(0); }} style={{ width: 170 }}>
          <option value="">All categories</option>
          {(["Cloud Provider", "Software Vendor", "Consultant", "Hardware", "Other"] as VendorCategory[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      <Card>
        {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>No vendors found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Name", "Criticality", "Status", "Category", "Country", "Risk Score", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((v) => (
                <tr key={v.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3">
                    <Link href={`/vendors/${v.id}`} className="font-medium hover:underline" style={{ color: "#818cf8" }}>
                      {v.name}
                    </Link>
                  </td>
                  <td className="py-2 px-3"><CriticalityBadge value={v.criticality} /></td>
                  <td className="py-2 px-3"><StatusBadge value={v.status} /></td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{v.category}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{v.country ?? "—"}</td>
                  <td className="py-2 px-3" style={{ color: v.risk_score != null && v.risk_score >= 70 ? "#f87171" : "#f1f5f9" }}>
                    {v.risk_score != null ? v.risk_score.toFixed(0) : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <Link href={`/vendors/${v.id}/edit`}>
                        <Button variant="secondary" size="sm">Edit</Button>
                      </Link>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(v.id, v.name)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && (
          <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
        )}
      </Card>
    </div>
  );
}
