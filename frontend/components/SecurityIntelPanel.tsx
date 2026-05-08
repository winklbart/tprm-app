"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getSecurityScanStatus, triggerSecurityScan } from "@/lib/api";
import type { ScanSource, ScanStatus, SecurityScanResult } from "@/lib/types";

// ── typed result shapes ──────────────────────────────────────────────────────

interface CveItem {
  cve_id: string;
  description: string;
  cvss_score: number | null;
  severity: string;
  url: string;
  epss_score?: number | null;
  in_cisa_kev?: boolean;
}

interface NvdResult   { cves: CveItem[]; total: number; error?: string }
interface KevResult   { matches: { cve_id: string; vulnerability_name?: string }[]; total: number; kev_total?: number; error?: string }
interface EpssResult  { enriched: number; scores: { cve_id: string; epss_score: number }[]; error?: string }
interface OsvVuln     { id: string; summary: string; cve_alias?: string | null; severity: string; ecosystem: string }
interface OsvResult   { vulns: OsvVuln[]; total: number; error?: string }
interface HibpBreach  { name: string; email_count: number }
interface HibpResult  { domain?: string; breaches?: HibpBreach[]; total?: number; skipped?: boolean; reason?: string; error?: string }
interface Finding     { severity: string; title: string; description?: string; recommendation?: string }
interface SuggestedRisk { category: string; title: string; likelihood: number; impact: number }
interface AiResult    { risk_score?: number; summary?: string; findings?: Finding[]; suggested_risks?: SuggestedRisk[]; error?: string }

// ── constants ────────────────────────────────────────────────────────────────

const SOURCE_META: Record<ScanSource, { label: string; description: string }> = {
  nvd:      { label: "NVD / NIST CVE",    description: "NIST National Vulnerability Database" },
  cisa_kev: { label: "CISA KEV",          description: "Known Exploited Vulnerabilities catalog" },
  epss:     { label: "EPSS",              description: "Exploit Prediction Scoring System" },
  osv:      { label: "OSV Database",      description: "Google Open Source Vulnerabilities" },
  hibp:     { label: "HaveIBeenPwned",    description: "Domain data breach check" },
  ai:       { label: "Claude AI Analysis",description: "AI-powered comprehensive risk assessment" },
};

const SOURCES: ScanSource[] = ["nvd", "cisa_kev", "epss", "osv", "hibp", "ai"];

const SEV_COLORS: Record<string, string> = {
  Critical: "#f87171",
  High: "#fb923c",
  Medium: "#86efac",
  Low: "#7dd3fc",
  Informational: "#64748b",
  Unknown: "#64748b",
};

// ── helpers ──────────────────────────────────────────────────────────────────

const clearStyle: React.CSSProperties = { color: "#86efac", fontSize: 12, marginTop: 8 };

function Skeleton() {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {[80, 60, 90].map((w) => (
        <div key={w} style={{ width: `${w}%`, height: 12, borderRadius: 6, background: "#1e2433", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

function SeverityDot({ sev }: { sev: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_COLORS[sev] ?? "#64748b", display: "inline-block", flexShrink: 0 }} />;
}

// ── per-source result renderers ───────────────────────────────────────────────

function NvdResults({ results }: { results: Record<string, unknown> }) {
  const r = results as unknown as NvdResult;
  const cves = r.cves ?? [];
  if (r.error) return <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>Error: {r.error}</p>;
  if (cves.length === 0) return <p style={clearStyle}>✓ No CVEs found</p>;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {cves.slice(0, 8).map((c) => (
        <div key={c.cve_id} className="flex items-start gap-2 text-xs">
          <SeverityDot sev={c.severity} />
          <div>
            <a href={c.url} target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>{c.cve_id}</a>
            <span style={{ color: "#64748b" }}> · CVSS {c.cvss_score != null ? c.cvss_score.toFixed(1) : "?"}</span>
            {c.epss_score != null && (
              <span style={{ color: "#64748b" }}> · EPSS {(c.epss_score * 100).toFixed(1)}%</span>
            )}
            {c.in_cisa_kev && <span style={{ color: "#f87171" }}> ⚠ KEV</span>}
            <p style={{ color: "#94a3b8", marginTop: 2 }}>{c.description.slice(0, 100)}</p>
          </div>
        </div>
      ))}
      {cves.length > 8 && <p style={{ color: "#64748b", fontSize: 11 }}>+{cves.length - 8} more</p>}
    </div>
  );
}

function KevResults({ results }: { results: Record<string, unknown> }) {
  const r = results as unknown as KevResult;
  if (r.error) return <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>Error: {r.error}</p>;
  const matches = r.matches ?? [];
  if (matches.length === 0) return <p style={clearStyle}>✓ No KEV matches</p>;
  return (
    <div className="flex flex-col gap-1 mt-2">
      {matches.slice(0, 5).map((m) => (
        <div key={m.cve_id} className="flex items-center gap-2 text-xs">
          <span style={{ color: "#f87171" }}>⚠</span>
          <span style={{ color: "#fb923c" }}>{m.cve_id}</span>
          <span style={{ color: "#64748b" }}>{(m.vulnerability_name ?? "").slice(0, 60)}</span>
        </div>
      ))}
    </div>
  );
}

function EpssResults({ results }: { results: Record<string, unknown> }) {
  const r = results as unknown as EpssResult;
  if (r.error) return <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>Error: {r.error}</p>;
  if (!r.enriched) return <p style={clearStyle}>✓ No EPSS data for found CVEs</p>;
  const highRisk = (r.scores ?? []).filter((s) => s.epss_score >= 0.5);
  return (
    <div className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
      <p>{r.enriched} CVE(s) enriched with exploit probability</p>
      {highRisk.length > 0 && <p style={{ color: "#fb923c", marginTop: 4 }}>{highRisk.length} with ≥50% exploit probability</p>}
    </div>
  );
}

function OsvResults({ results }: { results: Record<string, unknown> }) {
  const r = results as unknown as OsvResult;
  if (r.error) return <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>Error: {r.error}</p>;
  const vulns = r.vulns ?? [];
  if (vulns.length === 0) return <p style={clearStyle}>✓ No OSV entries found</p>;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {vulns.slice(0, 5).map((v) => (
        <div key={v.id} className="flex items-start gap-2 text-xs">
          <SeverityDot sev={v.severity} />
          <div>
            <span style={{ color: "#818cf8" }}>{v.id}</span>
            {v.cve_alias && <span style={{ color: "#64748b" }}> ({v.cve_alias})</span>}
            <p style={{ color: "#94a3b8", marginTop: 2 }}>{v.summary.slice(0, 100)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HibpResults({ results }: { results: Record<string, unknown> }) {
  const r = results as unknown as HibpResult;
  if (r.skipped) return <p style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Skipped: {r.reason}</p>;
  if (r.error) return <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>Error: {r.error}</p>;
  const breaches = r.breaches ?? [];
  if (breaches.length === 0) return <p style={clearStyle}>✓ No breaches found for {r.domain}</p>;
  return (
    <div className="mt-2">
      <p className="text-xs mb-2" style={{ color: "#f87171" }}>
        {breaches.length} breach(es) for domain {r.domain}
      </p>
      {breaches.slice(0, 5).map((b) => (
        <div key={b.name} className="flex items-center gap-2 text-xs mb-1">
          <span style={{ color: "#f87171" }}>●</span>
          <span style={{ color: "#94a3b8" }}>{b.name}</span>
          <span style={{ color: "#64748b" }}>({b.email_count} email(s))</span>
        </div>
      ))}
    </div>
  );
}

function AiResults({ results }: { results: Record<string, unknown> }) {
  const r = results as unknown as AiResult;
  const score = r.risk_score;
  const scoreColor = score == null ? "#64748b" : score >= 70 ? "#f87171" : score >= 40 ? "#fb923c" : "#86efac";

  return (
    <div className="mt-2">
      {r.error && <p style={{ color: "#f87171", fontSize: 12 }}>Error: {r.error}</p>}
      {score != null && (
        <div className="flex items-baseline gap-2 mb-2">
          <span style={{ fontSize: 28, fontWeight: 700, color: scoreColor }}>{score}</span>
          <span style={{ color: "#64748b", fontSize: 12 }}>/100 risk score</span>
        </div>
      )}
      {r.summary && <p className="text-xs mb-3" style={{ color: "#94a3b8" }}>{r.summary}</p>}
      {(r.findings ?? []).length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          <p className="text-xs font-medium" style={{ color: "#64748b" }}>Findings ({r.findings!.length})</p>
          {r.findings!.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <SeverityDot sev={f.severity} />
              <div>
                <p style={{ color: "#f1f5f9", fontWeight: 500 }}>{f.title}</p>
                {f.recommendation && <p style={{ color: "#94a3b8" }}>{f.recommendation}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(r.suggested_risks ?? []).length > 0 && (
        <p className="text-xs" style={{ color: "#64748b" }}>
          {r.suggested_risks!.length} risk(s) auto-added to Risk Register
        </p>
      )}
    </div>
  );
}

// ── card ─────────────────────────────────────────────────────────────────────

function SourceCard({ source, result, assetId }: { source: ScanSource; result: SecurityScanResult | undefined; assetId: number }) {
  const meta = SOURCE_META[source];
  const status: ScanStatus | "idle" = result?.status ?? "idle";

  return (
    <div style={{ background: "#131720", border: "0.5px solid #1e2433", borderRadius: 10, padding: "14px 16px" }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>{meta.label}</p>
          <p className="text-xs" style={{ color: "#64748b" }}>{meta.description}</p>
        </div>
        <StatusPill status={status} />
      </div>

      {(status === "pending" || status === "running") && <Skeleton />}

      {status === "completed" && result?.results && (
        <>
          {source === "nvd"      && <NvdResults  results={result.results} />}
          {source === "cisa_kev" && <KevResults  results={result.results} />}
          {source === "epss"     && <EpssResults results={result.results} />}
          {source === "osv"      && <OsvResults  results={result.results} />}
          {source === "hibp"     && <HibpResults results={result.results} />}
          {source === "ai"       && <AiResults   results={result.results} />}
        </>
      )}

      {status === "failed" && (
        <p className="text-xs mt-2" style={{ color: "#f87171" }}>Scan failed: {result?.error ?? "unknown error"}</p>
      )}
      {status === "idle" && <p className="text-xs mt-2" style={{ color: "#64748b" }}>Not yet scanned</p>}
    </div>
  );
}

function StatusPill({ status }: { status: ScanStatus | "idle" }) {
  const config: Record<string, { label: string; color: string }> = {
    idle:      { label: "—",         color: "#64748b" },
    pending:   { label: "Pending",   color: "#64748b" },
    running:   { label: "Scanning…", color: "#fb923c" },
    completed: { label: "Done",      color: "#86efac" },
    failed:    { label: "Failed",    color: "#f87171" },
  };
  const c = config[status] ?? config.idle;
  return <span className="text-xs font-medium" style={{ color: c.color }}>{c.label}</span>;
}

// ── summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ results }: { results: SecurityScanResult[] }) {
  const nvd = results.find((r) => r.source === "nvd");
  const cves = ((nvd?.results as unknown as NvdResult | null)?.cves) ?? [];
  const counts = { Critical: 0, High: 0, Medium: 0 };
  for (const c of cves) {
    if (c.severity in counts) counts[c.severity as keyof typeof counts]++;
  }
  const kev = results.find((r) => r.source === "cisa_kev");
  const kevCount = (kev?.results as unknown as KevResult | null)?.total ?? 0;
  if (cves.length === 0 && kevCount === 0) return null;
  return (
    <div className="flex gap-4 mt-1 text-sm">
      {counts.Critical > 0 && <Stat label="Critical" value={counts.Critical} color="#f87171" />}
      {counts.High > 0     && <Stat label="High"     value={counts.High}     color="#fb923c" />}
      {counts.Medium > 0   && <Stat label="Medium"   value={counts.Medium}   color="#86efac" />}
      {kevCount > 0        && <Stat label="KEV"      value={kevCount}        color="#f87171" />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color, fontWeight: 700 }}>{value}</span>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props { assetId: number }

export default function SecurityIntelPanel({ assetId }: Props) {
  const [results, setResults] = useState<SecurityScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getSecurityScanStatus(assetId);
      setResults(data);
      const allDone = data.length > 0 && data.every((r) => r.status === "completed" || r.status === "failed");
      if (allDone) { stopPolling(); setScanning(false); }
    } catch {
      stopPolling();
      setScanning(false);
    }
  }, [assetId, stopPolling]);

  useEffect(() => {
    fetchStatus();
    return stopPolling;
  }, [fetchStatus, stopPolling]);

  const handleScan = async () => {
    setError(null);
    setScanning(true);
    try {
      await triggerSecurityScan(assetId);
      await fetchStatus();
      pollRef.current = setInterval(fetchStatus, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start scan");
      setScanning(false);
    }
  };

  const bySource = Object.fromEntries(results.map((r) => [r.source, r])) as Record<ScanSource, SecurityScanResult | undefined>;

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Security Intelligence</h2>
          <SummaryBar results={results} />
        </div>
        <Button size="sm" onClick={handleScan} disabled={scanning}>
          {scanning ? "Scanning…" : results.length > 0 ? "Re-scan" : "Run Security Scan"}
        </Button>
      </div>

      {error && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        {SOURCES.map((src) => (
          <SourceCard key={src} source={src} result={bySource[src]} assetId={assetId} />
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: "#475569" }}>
        CVE data from NVD may be delayed for recently published vulnerabilities.
      </p>

      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </Card>
  );
}
