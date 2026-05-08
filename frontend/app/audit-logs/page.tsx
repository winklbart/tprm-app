"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Topbar } from "@/components/ui/Topbar";
import { getAuditLogs } from "@/lib/api";
import type { AuditLog, PaginatedResponse } from "@/lib/types";

const LIMIT = 50;

const ACTION_COLORS: Record<string, string> = {
  Create: "#22c55e",
  Update: "#818cf8",
  Delete: "#f87171",
  StatusChange: "#f59e0b",
};

export default function AuditLogsPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs({
        entity_type: entityType || undefined,
        action: action || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: LIMIT,
        offset,
      });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [entityType, action, fromDate, toDate, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Topbar title="Audit Logs" />

      <div className="flex flex-wrap gap-3 mb-4">
        <Select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setOffset(0); }}
          style={{ width: 150 }}
        >
          <option value="">All entities</option>
          {["vendor", "asset", "risk", "assessment"].map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </Select>
        <Select
          value={action}
          onChange={(e) => { setAction(e.target.value); setOffset(0); }}
          style={{ width: 160 }}
        >
          <option value="">All actions</option>
          {["Create", "Update", "Delete", "StatusChange"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setOffset(0); }}
          style={{ width: 160 }}
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setOffset(0); }}
          style={{ width: 160 }}
        />
      </div>

      <Card>
        {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#64748b" }}>No audit logs found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "0.5px solid #1e2433" }}>
                {["Timestamp", "Entity", "ID", "Action", "Changed By", "Changes"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((log) => (
                <tr key={log.id} style={{ borderBottom: "0.5px solid #1e2433" }}>
                  <td className="py-2 px-3" style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-3" style={{ color: "#94a3b8", textTransform: "capitalize" }}>
                    {log.entity_type}
                  </td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>#{log.entity_id}</td>
                  <td className="py-2 px-3">
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
                      background: "#1e2433", color: ACTION_COLORS[log.action] || "#64748b",
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3" style={{ color: "#64748b" }}>{log.changed_by || "—"}</td>
                  <td className="py-2 px-3" style={{ color: "#64748b", maxWidth: 320 }}>
                    {log.changes ? (
                      <pre style={{ fontSize: 10, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    ) : "—"}
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
