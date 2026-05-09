export type VendorCriticality = "Low" | "Medium" | "High" | "Critical";
export type VendorStatus = "Active" | "Inactive" | "Under Review" | "Offboarded";
export type VendorCategory =
  | "Cloud Provider"
  | "Software Vendor"
  | "Consultant"
  | "Hardware"
  | "Other";

export interface Vendor {
  id: number;
  name: string;
  criticality: VendorCriticality;
  status: VendorStatus;
  category: VendorCategory;
  country: string | null;
  website: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  risk_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AssetType = "Software" | "SaaS" | "API" | "On-Premise" | "Hardware";
export type DataClassification = "Public" | "Internal" | "Confidential" | "Restricted";

export interface Asset {
  id: number;
  vendor_id: number;
  name: string;
  type: AssetType;
  version: string | null;
  description: string | null;
  owner: string | null;
  license_expiry: string | null;
  data_classification: DataClassification;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSummary {
  id: number;
  type: string;
  status: string;
  due_date: string | null;
}

export interface RiskSummary {
  id: number;
  title: string;
  category: string;
  risk_score: number;
  status: string;
}

export interface VendorProfile extends Vendor {
  assets: Asset[];
  assessments: AssessmentSummary[];
  risks: RiskSummary[];
}

export type RiskCategory = "Data Privacy" | "Operational" | "Financial" | "Compliance" | "Reputational";
export type RiskStatus = "Open" | "In Mitigation" | "Accepted" | "Closed";

export interface Risk {
  id: number;
  vendor_id: number;
  asset_id: number | null;
  assessment_id: number | null;
  title: string;
  description: string | null;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  risk_score: number;
  mitigation_plan: string | null;
  owner: string | null;
  status: RiskStatus;
  vendor_name: string | null;
  created_at: string;
  updated_at: string;
}

export type AssessmentType = "self_assessment" | "ai_check" | "trust_center" | "access_to_information";
export type AssessmentStatus = "Draft" | "Sent" | "In Progress" | "Completed" | "Overdue" | "Closed";

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  self_assessment: "Self-Assessment",
  ai_check: "AI Check",
  trust_center: "Trust Center",
  access_to_information: "Access to Information",
};

export interface Question {
  id: string;
  question: string;
  type: "yesno" | "text" | "multiline";
}

export interface Assessment {
  id: number;
  vendor_id: number;
  asset_id: number | null;
  type: AssessmentType;
  status: AssessmentStatus;
  due_date: string | null;
  assigned_to: string | null;
  questions: Question[] | null;
  answers: Record<string, string> | null;
  ai_result: Record<string, unknown> | null;
  created_by: string | null;
  public_token: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  vendor_name: string | null;
}

export type ScanSource = "nvd" | "cisa_kev" | "epss" | "osv" | "hibp" | "ai";
export type ScanStatus = "pending" | "running" | "completed" | "failed";

export interface SecurityScanResult {
  id: number;
  asset_id: number;
  source: ScanSource;
  status: ScanStatus;
  results: Record<string, unknown> | null;
  error: string | null;
  scanned_at: string | null;
  created_at: string;
}

export interface AssetVulnerability {
  id: number;
  asset_id: number;
  cve_id: string;
  description: string | null;
  cvss_score: number | null;
  severity: "Critical" | "High" | "Medium" | "Low" | "Informational";
  epss_score: number | null;
  in_cisa_kev: boolean;
  published_date: string | null;
  url: string | null;
  created_at: string;
}

export interface TopVendor {
  id: number;
  name: string;
  criticality: string;
  risk_count: number;
  max_risk_score: number;
}

export interface RecentRisk {
  id: number;
  title: string;
  category: string;
  risk_score: number;
  status: string;
  vendor_name: string | null;
}

export interface OverdueAssessment {
  id: number;
  vendor_name: string | null;
  type: string;
  due_date: string | null;
  assigned_to: string | null;
  days_overdue: number;
}

export interface DashboardData {
  vendor_count: number;
  asset_count: number;
  risk_count: number;
  open_risk_count: number;
  assessment_count: number;
  overdue_count: number;
  vendor_by_criticality: Record<string, number>;
  risk_by_status: Record<string, number>;
  risk_by_category: Record<string, number>;
  assessment_by_status: Record<string, number>;
  top_risk_vendors: TopVendor[];
  recent_risks: RecentRisk[];
  overdue_assessments: OverdueAssessment[];
}

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  changed_by: string | null;
  changes: Record<string, unknown> | null;
  timestamp: string;
}

// ── Assessment Templates ────────────────────────────────────────────────────

export type TemplateQuestionType = "yes_no" | "text" | "multiple_choice" | "file_upload" | "rating";

export const QUESTION_TYPE_LABELS: Record<TemplateQuestionType, string> = {
  yes_no: "Yes / No",
  text: "Text",
  multiple_choice: "Multiple Choice",
  file_upload: "File Upload",
  rating: "Rating",
};

export const QUESTION_TYPE_ICONS: Record<TemplateQuestionType, string> = {
  yes_no: "⊙",
  text: "¶",
  multiple_choice: "≡",
  file_upload: "↑",
  rating: "★",
};

export interface TemplateQuestion {
  id: number;
  template_id: number;
  sort_order: number;
  title: string;
  description: string | null;
  type: TemplateQuestionType;
  options: string[] | null;
  required: boolean;
  created_at: string;
}

export interface AssessmentTemplate {
  id: number;
  name: string;
  description: string | null;
  criticality: VendorCriticality | null;
  is_base_template: boolean;
  version: number;
  is_active: boolean;
  created_by: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentTemplateDetail extends AssessmentTemplate {
  questions: TemplateQuestion[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CSVImportResult {
  imported: number;
  errors: string[];
}
