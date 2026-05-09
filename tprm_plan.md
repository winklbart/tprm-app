# TPRM Application — Project Plan for ClaudeCode

## Project Overview

Build a modern, cloud-ready **Third-Party Risk Management (TPRM) SaaS application** that manages vendors, assets, assessments, and risks. The application is designed to run autonomously and will later serve as a middleware layer between ServiceNow and OneTrust.

---

## Vision & Strategic Context

The app replaces and improves a manual process currently handled in OneTrust:
- New Application Requests arrive via ServiceNow
- Vendors and software are evaluated manually
- Assessments are created and sent to vendors in OneTrust

**Target state:** The TPRM app ingests ServiceNow requests automatically, runs AI-powered risk checks, and forwards enriched data to OneTrust — while also functioning as a standalone tool.

ServiceNow and OneTrust integrations are **optional for the initial build**. The app must be fully functional without them.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Modern, performant, SSR |
| Backend | FastAPI (Python) | Async, ideal for middleware role and AI integration |
| Database | PostgreSQL | Scales to 1000+ vendors |
| AI | Anthropic Claude API | Security checks, risk analysis |
| Infrastructure | Docker Compose | Flexible: cloud (AWS/Azure) or on-premise |

---

## Project Structure

```
tprm-app/
├── backend/
│   ├── app/
│   │   ├── api/           # Route handlers per module
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic
│   │   └── ai/            # Claude API integration
│   ├── alembic/           # Database migrations
│   └── main.py
├── frontend/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # Reusable UI components
│   └── lib/               # API client, utilities
├── docker-compose.yml
└── .env.example
```

---

## Data Model

### Vendor
```
id, name, criticality (Low | Medium | High | Critical),
status (Active | Inactive | Under Review | Offboarded),
category (Cloud Provider | Software Vendor | Consultant | Hardware | Other),
country, website, primary_contact_name, primary_contact_email,
risk_score (0-100, calculated), notes, created_at, updated_at
```

### Asset
```
id, vendor_id (FK → Vendor), name, type (Software | SaaS | API | On-Premise | Hardware),
version, description, owner (internal user),
license_expiry, data_classification (Public | Internal | Confidential | Restricted),
created_at, updated_at
```

### Assessment
```
id, vendor_id (FK), asset_id (FK, optional),
type (self_assessment | ai_check | trust_center | access_to_information),
status (Draft | Sent | In Progress | Completed | Overdue | Closed),
due_date, completed_at,
questions (JSONB), answers (JSONB), ai_result (JSONB),
created_by, assigned_to, created_at, updated_at
```

### Risk
```
id, vendor_id (FK), asset_id (FK, optional), assessment_id (FK, optional),
title, description, category (Data Privacy | Operational | Financial | Compliance | Reputational),
likelihood (1-5), impact (1-5), risk_score (likelihood × impact, calculated),
mitigation_plan, owner (internal user),
status (Open | In Mitigation | Accepted | Closed),
created_at, updated_at
```

### Finding
```
id, assessment_id (FK), risk_id (FK, optional),
severity (Critical | High | Medium | Low | Informational),
description, recommendation, status (Open | Resolved | Accepted),
created_at, updated_at
```

### AuditLog
```
id, entity_type, entity_id, action (Create | Update | Delete | StatusChange),
changed_by, changes (JSONB), timestamp
```

---

## Modules

### 1. Vendor Management
- Full CRUD for vendors
- Criticality levels: Low, Medium, High, Critical
- Status lifecycle management
- Vendor categorization
- Vendor 360° profile view: shows all related assets, assessments, risks, and audit history in one view
- Benchmarking: compare vendor risk scores
- Bulk import via CSV

### 2. Asset Management
- Link assets to vendors
- Asset types: Software, SaaS, API, On-Premise, Hardware
- Data classification tagging
- License expiry tracking with alerts
- Internal owner assignment
- Dependency tracking: which internal teams/processes use this asset

### 3. Assessment Module
Assessment templates vary by vendor criticality:

| Criticality | Assessment Types Required |
|---|---|
| Low | Self-assessment (short) |
| Medium | Self-assessment (standard) + AI check |
| High | Self-assessment (full) + AI check + Trust Center review |
| Critical | All of the above + Access-to-Information request |

Features:
- Assessment template management (create, edit, version)
- Send self-assessments to vendor contacts via email link (no login required for vendor)
- AI Security Check: send vendor profile + answers to Claude API for automated risk analysis
- Trust Center evaluation: evaluate vendor-provided Trust Center documentation
- Access-to-Information requests: formal requests for security documentation
- Import/Export: CSV, JSON, PDF
- Assessment status tracking and automated reminders

### 4. Risk Management
- Risk Register: central list of all risks across vendors and assets
- Risk scoring: Likelihood (1-5) × Impact (1-5) = Risk Score (1-25)
- Risk categories: Data Privacy, Operational, Financial, Compliance, Reputational
- Risk heatmap visualization (interactive likelihood × impact matrix)
- Mitigation tracking with owner assignment and due dates
- Risk lifecycle: Open → In Mitigation → Accepted | Closed
- Link risks to findings from assessments
- Risk reporting for executive stakeholders

---

## Additional Recommended Features

These are not in the original requirements but are standard for a production TPRM tool:

**Executive Dashboard**
- Overall risk posture score
- Vendor distribution by criticality (donut chart)
- Open assessments and overdue items
- Top 5 highest-risk vendors
- Trend chart: risk score over time

**Notification & Alerting**
- Email reminders for overdue assessments
- Alerts for license expiry
- Alerts when a vendor's risk score crosses a threshold
- Slack/webhook integration (optional)

**Audit Log**
- Every create, update, delete, and status change is logged
- Filterable by user, entity, date range
- Required for compliance and due diligence

**User Management & RBAC**
- Roles: Admin, Risk Manager, Analyst, Read-Only
- Permissions per module
- SSO-ready (OIDC/SAML, optional)

**Reporting**
- Generate PDF reports per vendor (vendor profile + assets + risks + assessments)
- Scheduled report emails
- Compliance report templates

---

## AI Integration (Claude API)

When an AI Security Check is triggered:

**Input sent to Claude:**
- Vendor profile (name, category, criticality, country)
- Asset details (type, data classification)
- Assessment answers (from self-assessment questionnaire)
- Existing known risks for this vendor

**Expected output (structured JSON):**
```json
{
  "risk_score": 72,
  "summary": "...",
  "findings": [
    {
      "severity": "High",
      "title": "No SOC 2 certification",
      "description": "...",
      "recommendation": "..."
    }
  ],
  "suggested_risks": [
    {
      "category": "Data Privacy",
      "title": "...",
      "likelihood": 4,
      "impact": 5
    }
  ]
}
```

---

## Future Integrations (Phase 2, optional)

### ServiceNow
- Webhook receiver: `POST /api/v1/integrations/servicenow/webhook`
- Ingest New Application Request fields
- Auto-create vendor + asset draft in TPRM
- Trigger AI check automatically
- Report back status to ServiceNow ticket

### OneTrust
- Push created vendors and assets to OneTrust via API
- Sync assessment results
- Endpoint: `POST /api/v1/integrations/onetrust/sync`

### NVD Integration (NIST National Vulnerability Database)

#### Overview
The NVD (National Vulnerability Database) by NIST provides a free public REST API (v2.0) with 200,000+ catalogued CVEs. Since the backend is Python-based, use the `nvdlib` library which wraps the NVD API v2 and handles rate limiting automatically. A free API key can be requested at nvd.nist.gov/developers/request-an-api-key.

#### How it fits into the project
Assets already have `name`, `type`, and `version` fields. When an asset is saved or manually triggered, the backend queries the NVD for known CVEs matching that product and version. Results are displayed directly in the Asset profile view. Critical or High severity CVEs automatically create a Risk entry in the Risk Register.

#### Implementation
- **Library:** `nvdlib` (`pip install nvdlib`)
- **Trigger:** on asset save or via manual "Scan for CVEs" button in the Asset profile
- **Endpoint:** `POST /api/v1/assets/{id}/nvd-scan`
- Query NVD by CPE name or keyword (product name + version)
- Store results in a new table `asset_vulnerabilities`: `asset_id`, `cve_id`, `description`, `cvss_score`, `severity` (Critical / High / Medium / Low), `published_date`, `url`
- If any CVE has severity Critical or High, auto-create a Risk entry linked to the asset with the CVE title as risk title and the CVSS score mapped to likelihood/impact
- Display CVEs in the Asset profile grouped by severity with CVSS score and a link to the NVD entry

#### Important limitation
Since early 2024, NVD has a growing backlog of unprocessed CVEs, meaning very recent vulnerabilities may appear with a delay. This should be noted in the UI as a disclaimer.

#### Phase
This feature is part of **Phase 5 (AI Integration)**, where external data sources are combined with the Claude AI security check for a comprehensive vendor and asset risk assessment.

### Security Intelligence Panel

#### Overview
Every Asset and Vendor profile displays a Security Intelligence Panel. Each data source gets its own Card. Cards load in parallel and update dynamically — a Skeleton Loader is shown while a source is scanning, a green "clear" state is shown if nothing is found, and findings are shown with severity badges if something is detected. A summary bar at the top aggregates totals across all sources (Critical / High / Medium / Clear).

#### Data Sources
- **NVD / NIST** — already covered in the NVD Integration section above. Searches CVEs by product name and version. Library: `nvdlib`. Free.
- **CISA KEV (Known Exploited Vulnerabilities)** — REST API listing CVEs actively exploited in the wild. A CVE appearing here signals immediate action is needed, regardless of CVSS score. Endpoint: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`. Free, no API key required.
- **EPSS (Exploit Prediction Scoring System)** — assigns each CVE an exploit probability score (0–100%). Allows prioritization of CVEs by actual exploitation likelihood rather than just severity. API: `https://api.first.org/data/v1/epss`. Free.
- **OSV Database (Google)** — Open Source Vulnerability Database. Especially relevant for Software and SaaS assets with npm, pip, or other package dependencies. API: `https://api.osv.dev/v1/query`. Free.
- **HaveIBeenPwned** — checks whether a vendor's domain has appeared in known data breaches. Query by domain. Free tier available for domain search. Requires API key.
- **Claude AI Check** — automated risk analysis combining all scan results plus vendor profile and assessment answers. Returns structured findings and suggested risks. Runs last, after all other sources have completed.

#### Backend Implementation
- Each source has its own service class under `backend/app/services/security_intel/`
- All scans run in parallel using Python `asyncio`
- New endpoint: `POST /api/v1/assets/{id}/security-scan` triggers all sources
- New endpoint: `GET /api/v1/assets/{id}/security-scan/status` returns per-source status and results
- New table `security_scan_results`: `id`, `asset_id`, `source` (nvd / cisa_kev / epss / osv / hibp / ai), `status` (pending / running / completed / failed), `results` (JSONB), `scanned_at`
- CVE findings and Security Intelligence results are intentionally separated from the Risk Register. Auto-creation of Risk Register entries is disabled. Findings live exclusively in the asset_vulnerabilities table and are displayed only in the Security Intelligence Panel on the Asset profile and Vendor 360° view. Users promote findings to the Risk Register manually via two options: a 'Promote to Risk Register' button per individual finding (opens a pre-filled Risk form for review before saving), and a 'Add selected to Risk Register' bulk action with a checkbox per finding and a select-all checkbox in the panel header. Bulk promotion creates pre-filled Risk entries for all selected findings simultaneously. This keeps the Risk Register focused on actively managed risks and prevents auto-generated CVE data from cluttering it.

#### Frontend Implementation
- Security Intelligence Panel component shown on Asset profile page and Vendor 360° view
- Summary bar: Critical count, High count, Medium count, Sources clear count
- One Card per source, loaded in parallel
- Card states: loading (Skeleton Loader), clear (green shield icon, no findings), findings (list of CVEs/breaches with severity dot, description, score, link)
- Re-scan button triggers a fresh scan of all sources
- Disclaimer shown below panel: "CVE data from NVD may be delayed for recently published vulnerabilities."

#### Phase
This feature is part of **Phase 5 (AI Integration)**. Build order within Phase 5: NVD → CISA KEV → EPSS → OSV → HaveIBeenPwned → Claude AI Check (last, as it consumes results from all other sources).

---

## UI / Design System

### General

- Default Dark Mode with optional Light Mode toggle (stored in localStorage, respects system preference as fallback)
- Font: Inter (Google Fonts)
- Component library: shadcn/ui (Next.js + Tailwind)
- Layout: fixed sidebar navigation on the left, topbar with page title and actions

### Color Palette

- Background primary: #0f1117
- Background secondary (cards): #131720
- Border: #1e2433
- Accent / Primary: #4f46e5 (Indigo)
- Text primary: #f1f5f9
- Text muted: #64748b

### Criticality Colors (used consistently across all modules — badges, dots, highlights)

- Critical: #f87171 (red), background #3b1a1a
- High: #fb923c (orange), background #2d1f0e
- Medium: #86efac (green), background #1f2a1a
- Low: #7dd3fc (blue), background #0f1f2a

### Component Conventions

- Border radius: 8px for inputs and badges, 10px for cards
- Border width: 0.5px throughout
- Buttons: primary uses accent color, secondary uses transparent background with border
- Cards: #131720 background, 0.5px border, 10px radius, 16px padding
- Navigation items: 8px radius, active state uses #1e1b4b background and #818cf8 text
- Metric cards: large number (22px, weight 600), small muted label above, trend indicator below

### Dashboard Layout (reference implementation)

- Sidebar: 220px wide, logo at top, grouped nav sections, user profile at bottom
- Topbar: page title left, action buttons right
- Content area: 20px 24px padding, 16px gap between sections
- Metric row: 4-column grid at top of dashboard
- Below metrics: 2-column grid for tables/lists (e.g. Top Risk Vendors + Open Risks)

---

## Build Phases

### Phase 1 — Foundation
Set up the full project scaffold:
- FastAPI backend with PostgreSQL, SQLAlchemy, Alembic
- Next.js 14 frontend with TypeScript and Tailwind CSS
- Docker Compose with services: postgres, backend (port 8000), frontend (port 3000)
- CORS configuration, basic JWT auth middleware
- Health check endpoint
- Alembic migration for initial schema (all tables above)

### Phase 2 — Vendor & Asset Management
- Full REST API for vendors and assets (CRUD + list + filter + search)
- Frontend: vendor list with filters, vendor form, vendor 360° profile view
- Frontend: asset list per vendor, asset form
- CSV bulk import for vendors

### Phase 3 — Risk Management
- Risk Register API (CRUD + filter by vendor, asset, status, category)
- Risk score calculation (likelihood × impact)
- Frontend: Risk Register table, risk form, risk heatmap (interactive matrix)
- Link risks to vendors and assets

### Phase 4 — Assessment Module
- Assessment template engine (questions vary by criticality)
- Assessment CRUD API
- Self-assessment vendor link (public token-based form, no login required)
- Frontend: assessment management, status tracking
- Email sending for assessment invitations and reminders
- PDF export of completed assessments

### Phase 5 — Security Intelligence & AI Integration
Implement the full Security Intelligence Panel with parallel async scanning across NVD, CISA KEV, EPSS, OSV, and HaveIBeenPwned. Each source gets its own service class and returns structured results. Build the dynamic Card UI with Skeleton Loaders and per-source status. Finally, implement the Claude AI Check as the last step, feeding all scan results plus vendor and assessment data into the AI for a comprehensive risk summary, structured findings, and auto-generated Risk Register entries.

### Phase 6 — Dashboard & Reporting
- Executive dashboard with charts (Recharts or Chart.js)
- Audit log view
- PDF report generation per vendor
- Notification system (email alerts for overdue items, threshold breaches)

### Phase 7 — Integrations (optional)
- ServiceNow webhook receiver
- OneTrust sync endpoint
- Field mapping configuration UI

---

## Non-Functional Requirements

- API versioning from day one (`/api/v1/...`)
- All endpoints documented via OpenAPI/Swagger (FastAPI auto-generates this)
- Pagination on all list endpoints (limit/offset)
- Full-text search on vendors and assets
- Rate limiting on public endpoints (assessment vendor forms)
- Environment-based configuration via `.env`
- Seed script for local development (sample vendors, assets, risks)

---

## Starting Prompt for ClaudeCode (Phase 1)

Use this prompt to begin:

> Build a full-stack Third-Party Risk Management (TPRM) SaaS application called "TPRM Hub".
>
> **Backend:** FastAPI (Python) with SQLAlchemy ORM, Alembic for migrations, and PostgreSQL. Structure the project under `backend/app/` with subfolders: `api/`, `models/`, `schemas/`, `services/`, `ai/`. Add JWT-based auth middleware, CORS for localhost:3000, and a `/health` endpoint. Create Alembic migrations for all initial tables: Vendor, Asset, Assessment, Risk, Finding, AuditLog (see schema in project plan).
>
> **Frontend:** Next.js 14 with App Router, TypeScript, and Tailwind CSS. Set up the folder structure under `frontend/app/` with routes for: `/dashboard`, `/vendors`, `/assets`, `/assessments`, `/risks`. Add a basic navigation sidebar.
>
> **Infrastructure:** Docker Compose with three services: `postgres` (port 5432), `backend` (port 8000), `frontend` (port 3000). Include `.env.example` with all required environment variables (DATABASE_URL, SECRET_KEY, ANTHROPIC_API_KEY, etc.).
>
> Do not implement business logic yet — focus on a clean, working scaffold that runs with `docker compose up`.
