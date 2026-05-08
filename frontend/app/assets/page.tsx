"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Topbar } from "@/components/ui/Topbar";
import { deleteAsset, getAssets } from "@/lib/api";
import type { Asset, AssetType, DataClassification, PaginatedResponse } from "@/lib/types";

const LIMIT = 25;

export default function AssetsPage() {
  const [data, setData] = useState<PaginatedResponse<Asset> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<AssetType | "">("");
  const [classification, setClassification] = useState<DataClassification | "">("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAssets({
        search: search || undefined,
        type: type || undefined,
        data_classification: classification || undefined,
        limit: LIMIT,
        offset,
      });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [search, type, classification, offset]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete asset "${name}"?`)) return;
    await deleteAsset(id);
    load();
  };

  return (
    <div>
      <Topbar
        title="Assets"
        actions={
          <Link href="/assets/new">
            <Button size="sm">+ Add Asset</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          style={{ width: 220 }}
        />
        <Select value={type} onChange={(e) => { setType(e.target.value as AssetType | ""); setOffset(0); }} style={{ width: 150 }}>
          <option value="">All types</option>
          {(["Software", "SaaS", "API", "On-Premise", "Hardware"] as AssetType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select value={classification} onChange={(e) => { setClassification(e.target.value as DataClassification | ""); setOffset(0); }} style={{ width: 160 }}>
          <option value="">All classifications</option>
          {(["Public", "Internal", "Confidential", "Restricted"] as DataClassification[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      <Card>
        {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>No assets found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Name", "Type", "Classification", "Owner", "License Expiry", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => {
                const expired = a.license_expiry && new Date(a.license_expiry) < new Date();
                return (
                  <tr key={a.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                    <td className="py-2 px-3 font-medium" style={{ color: "#f1f5f9" }}>{a.name}</td>
                    <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.type}</td>
                    <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.data_classification}</td>
                    <td className="py-2 px-3" style={{ color: "#64748b" }}>{a.owner ?? "—"}</td>
                    <td className="py-2 px-3" style={{ color: expired ? "#f87171" : "#64748b" }}>
                      {a.license_expiry ?? "—"}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <Link href={`/assets/${a.id}`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                        <Link href={`/assets/${a.id}/edit`}>
                          <Button variant="secondary" size="sm">Edit</Button>
                        </Link>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(a.id, a.name)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
