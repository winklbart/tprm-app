import type {
  Assessment,
  AssessmentStatus,
  AssessmentType,
  Asset,
  AssetVulnerability,
  AuditLog,
  CSVImportResult,
  DashboardData,
  PaginatedResponse,
  Risk,
  RiskCategory,
  RiskStatus,
  SecurityScanResult,
  Vendor,
  VendorCategory,
  VendorCriticality,
  VendorProfile,
  VendorStatus,
} from "./types";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

// --- Vendors ---

export interface VendorFilters {
  search?: string;
  criticality?: VendorCriticality;
  status?: VendorStatus;
  category?: VendorCategory;
  limit?: number;
  offset?: number;
}

export function getVendors(filters: VendorFilters = {}): Promise<PaginatedResponse<Vendor>> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.criticality) params.set("criticality", filters.criticality);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return fetchApi(`/api/v1/vendors${qs ? `?${qs}` : ""}`);
}

export function getVendor(id: number): Promise<Vendor> {
  return fetchApi(`/api/v1/vendors/${id}`);
}

export function getVendorProfile(id: number): Promise<VendorProfile> {
  return fetchApi(`/api/v1/vendors/${id}/profile`);
}

export function createVendor(data: Omit<Vendor, "id" | "risk_score" | "created_at" | "updated_at">): Promise<Vendor> {
  return fetchApi("/api/v1/vendors", { method: "POST", body: JSON.stringify(data) });
}

export function updateVendor(id: number, data: Partial<Omit<Vendor, "id" | "created_at" | "updated_at">>): Promise<Vendor> {
  return fetchApi(`/api/v1/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteVendor(id: number): Promise<void> {
  return fetchApi(`/api/v1/vendors/${id}`, { method: "DELETE" });
}

export function importVendorsCSV(file: File): Promise<CSVImportResult> {
  const form = new FormData();
  form.append("file", file);
  return fetchApi("/api/v1/vendors/import/csv", {
    method: "POST",
    headers: {},
    body: form,
  });
}

// --- Assets ---

export interface AssetFilters {
  vendor_id?: number;
  type?: string;
  data_classification?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getAssets(filters: AssetFilters = {}): Promise<PaginatedResponse<Asset>> {
  const params = new URLSearchParams();
  if (filters.vendor_id != null) params.set("vendor_id", String(filters.vendor_id));
  if (filters.type) params.set("type", filters.type);
  if (filters.data_classification) params.set("data_classification", filters.data_classification);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return fetchApi(`/api/v1/assets${qs ? `?${qs}` : ""}`);
}

export function getAsset(id: number): Promise<Asset> {
  return fetchApi(`/api/v1/assets/${id}`);
}

export function createAsset(data: Omit<Asset, "id" | "created_at" | "updated_at">): Promise<Asset> {
  return fetchApi("/api/v1/assets", { method: "POST", body: JSON.stringify(data) });
}

export function updateAsset(id: number, data: Partial<Omit<Asset, "id" | "vendor_id" | "created_at" | "updated_at">>): Promise<Asset> {
  return fetchApi(`/api/v1/assets/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteAsset(id: number): Promise<void> {
  return fetchApi(`/api/v1/assets/${id}`, { method: "DELETE" });
}

// --- Risks ---

export interface RiskFilters {
  vendor_id?: number;
  asset_id?: number;
  status?: RiskStatus;
  category?: RiskCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getRisks(filters: RiskFilters = {}): Promise<PaginatedResponse<Risk>> {
  const params = new URLSearchParams();
  if (filters.vendor_id != null) params.set("vendor_id", String(filters.vendor_id));
  if (filters.asset_id != null) params.set("asset_id", String(filters.asset_id));
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return fetchApi(`/api/v1/risks${qs ? `?${qs}` : ""}`);
}

export function getRisk(id: number): Promise<Risk> {
  return fetchApi(`/api/v1/risks/${id}`);
}

export function createRisk(data: Omit<Risk, "id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">): Promise<Risk> {
  return fetchApi("/api/v1/risks", { method: "POST", body: JSON.stringify(data) });
}

export function updateRisk(id: number, data: Partial<Omit<Risk, "id" | "vendor_id" | "risk_score" | "vendor_name" | "created_at" | "updated_at">>): Promise<Risk> {
  return fetchApi(`/api/v1/risks/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteRisk(id: number): Promise<void> {
  return fetchApi(`/api/v1/risks/${id}`, { method: "DELETE" });
}

// --- Assessments ---

export interface AssessmentFilters {
  vendor_id?: number;
  type?: AssessmentType;
  status?: AssessmentStatus;
  limit?: number;
  offset?: number;
}

export function getAssessments(filters: AssessmentFilters = {}): Promise<PaginatedResponse<Assessment>> {
  const params = new URLSearchParams();
  if (filters.vendor_id != null) params.set("vendor_id", String(filters.vendor_id));
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return fetchApi(`/api/v1/assessments${qs ? `?${qs}` : ""}`);
}

export function getAssessment(id: number): Promise<Assessment> {
  return fetchApi(`/api/v1/assessments/${id}`);
}

export function createAssessment(data: {
  vendor_id: number;
  asset_id?: number | null;
  type: AssessmentType;
  due_date?: string | null;
  assigned_to?: string | null;
}): Promise<Assessment> {
  return fetchApi("/api/v1/assessments", { method: "POST", body: JSON.stringify(data) });
}

export function updateAssessment(id: number, data: {
  status?: AssessmentStatus;
  due_date?: string | null;
  assigned_to?: string | null;
}): Promise<Assessment> {
  return fetchApi(`/api/v1/assessments/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteAssessment(id: number): Promise<void> {
  return fetchApi(`/api/v1/assessments/${id}`, { method: "DELETE" });
}

export function sendAssessment(id: number): Promise<Assessment> {
  return fetchApi(`/api/v1/assessments/${id}/send`, { method: "POST" });
}

export function getPublicAssessment(token: string): Promise<Assessment> {
  return fetchApi(`/api/v1/public/assessments/${token}`);
}

export function submitPublicAssessment(token: string, answers: Record<string, string>): Promise<Assessment> {
  return fetchApi(`/api/v1/public/assessments/${token}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

// --- Dashboard ---

export function getDashboard(): Promise<DashboardData> {
  return fetchApi("/api/v1/dashboard");
}

// --- Audit Logs ---

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: number;
  action?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export function getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
  const params = new URLSearchParams();
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.entity_id != null) params.set("entity_id", String(filters.entity_id));
  if (filters.action) params.set("action", filters.action);
  if (filters.from_date) params.set("from_date", filters.from_date);
  if (filters.to_date) params.set("to_date", filters.to_date);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return fetchApi(`/api/v1/audit-logs${qs ? `?${qs}` : ""}`);
}

// --- Security Intelligence ---

export function triggerSecurityScan(assetId: number): Promise<{ message: string }> {
  return fetchApi(`/api/v1/assets/${assetId}/security-scan`, { method: "POST" });
}

export function getSecurityScanStatus(assetId: number): Promise<SecurityScanResult[]> {
  return fetchApi(`/api/v1/assets/${assetId}/security-scan/status`);
}

export function getVulnerabilities(assetId: number): Promise<AssetVulnerability[]> {
  return fetchApi(`/api/v1/assets/${assetId}/vulnerabilities`);
}
