"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/ui/Topbar";
import { importVendorsCSV } from "@/lib/api";
import type { CSVImportResult } from "@/lib/types";

export default function ImportVendorsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importVendorsCSV(file);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar
        title="Import Vendors (CSV)"
        actions={
          <Link href="/vendors">
            <Button variant="secondary" size="sm">← Back</Button>
          </Link>
        }
      />

      <Card style={{ maxWidth: 600 }}>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>
          Upload a CSV file with columns: <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>name</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>criticality</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>category</code>{" "}
          (required) plus optional: <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>status</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>country</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>website</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>primary_contact_name</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>primary_contact_email</code>,{" "}
          <code className="text-xs px-1 rounded" style={{ background: "#0f1117", color: "#818cf8" }}>notes</code>.
        </p>

        <div
          className="flex flex-col items-center justify-center gap-3 py-8 mb-4 cursor-pointer"
          style={{ border: "0.5px dashed #1e2433", borderRadius: 10 }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-sm font-medium" style={{ color: "#818cf8" }}>{file.name}</p>
          ) : (
            <p className="text-sm" style={{ color: "#64748b" }}>Click to select a CSV file</p>
          )}
        </div>

        {error && <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>}

        {result && (
          <div className="mb-4 p-3 rounded-[10px]" style={{ background: "#0f1117", border: "0.5px solid #1e2433" }}>
            <p className="text-sm font-medium mb-1" style={{ color: "#86efac" }}>
              {result.imported} vendor{result.imported !== 1 ? "s" : ""} imported successfully.
            </p>
            {result.errors.length > 0 && (
              <>
                <p className="text-xs font-medium mb-1" style={{ color: "#f87171" }}>{result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:</p>
                <ul className="text-xs space-y-0.5" style={{ color: "#64748b" }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? "Importing…" : "Import"}
          </Button>
          {result && (
            <Link href="/vendors">
              <Button variant="secondary">View Vendors</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
