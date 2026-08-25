# 📦 ParcelPilot AI Customer Support & Operations Platform

> **CalQuity AI Engineer Assessment Submission**  
> An intelligent customer support and operations AI agent system for ParcelPilot with strict tenant data isolation, 5-tier source precedence conflict resolution, two-phase human-in-the-loop state action confirmation, and real-time proactive operational issue detection.

---

## 🌟 Key Highlights & Assessment Compliance

1. **Dual Persona Support:**
   - **Customer Support Portal:** Scoped strictly to the authenticated tenant (`ACCT-001` Northstar, `ACCT-002` LumenWorks, `ACCT-003` Beacon Retail, `ACCT-004` Axis Labs).
   - **Internal Operations Console:** Role-based permissions (`support_agent`, `ops_lead`, `admin`) with cross-account operational radar, SLA monitors, order ledger, and audit log.
2. **Persistent Database (SQLite):**
   - Real persistent SQLite database (`parcelpilot.db`) seeded with all accounts, orders, tickets, 6 knowledge base documents, and known issues.
3. **Hard Data-Layer RBAC & Tenant Isolation:**
   - Database-level tenant filtering (`WHERE account_id = ?`). Any cross-tenant access attempt returns `403 Forbidden: Scope Violation` and records an immutable `SECURITY_VIOLATION` audit log.
4. **Tri-Tool Autonomous Reasoning Agent:**
   - **Tool 1 (`document_search`):** Search policies, agreements, and product guides with RBAC and metadata weighting.
   - **Tool 2 (`structured_query` & `financial_calculator`):** Query transactional records, evaluate delay hours vs reference snapshot `2026-08-16 11:00 AM IST`, calculate exact cancellation fees and failed-pickup service credits.
   - **Tool 3 (`state_action`):** Two-phase state mutations with interactive **Human-in-the-Loop Confirmation Cards** requiring user approval before database transactions.
5. **5-Tier Authoritative Precedence Hierarchy (Problem 2):**
   - `Signed Customer Agreement (Tier 1) > Current Support Policy v3 & SOP v4 (Tier 2) > Product Ops Guide (Tier 3) > Deprecated Policy v2 (Tier 4 Guarded) > Historical Tickets (Tier 5 Untrusted Context)`.
6. **Proactive Operations Radar (Problem 1):**
   - Live clustering for P1 outages (`TKT-501`), active bug spikes (`KI-208`), carrier sync latency (`KI-211`), security credential leaks (`TKT-505`), and pending credit liabilities.
7. **Real-Time Live UI Sync:**
   - Server-Sent Events (SSE) `/api/events` live stream pushes updates whenever state mutations or audit records occur.

---

## 🚀 Quick Start Instructions

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Running Locally

1. **Clone & Install Dependencies:**
   ```bash
   cd parcelpilot-ai-support
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Optional: You can add `GEMINI_API_KEY=your_key_here` to enable dynamic Gemini LLM synthesis. When omitted, the built-in deterministic rule & precedence engine operates with 100% accuracy).*

3. **Start Both Backend and Frontend (Concurrently):**
   ```bash
   npm run dev
   ```
   - **Backend API:** `http://localhost:3001`
   - **Frontend Application:** `http://localhost:5173`

4. **Run Automated Test Suite:**
   ```bash
   npm test
   ```

---

## 🧪 Automated Backend Test Suite Results

```bash
> node tests/backend.test.js

🧪 Starting ParcelPilot Comprehensive Backend Automated Test Suite...

  ✅ PASS: Database seeded with required accounts, orders, tickets, documents, and known issues
  ✅ PASS: Customer user can only search general documents and own customer agreement
  ✅ PASS: Signed customer agreement (Tier 1) wins over standard SOP (Tier 2)
  ✅ PASS: Deprecated Support Policy v2 is guarded and never wins precedence
  ✅ PASS: Northstar ORD-1001 cancellation fee is INR 0 due to contract waiver
  ✅ PASS: ORD-2001 requested 75 mins after booking charges standard INR 250 fee under SOP v4
  ✅ PASS: ORD-3001 requested 15 mins after booking charges INR 0 fee under SOP v4
  ✅ PASS: LumenWorks ORD-2002 delay (4.5h > 4h threshold) receives fixed INR 300 credit
  ✅ PASS: Northstar TKT-501 (P1 outage, created 10:30, target 15m) is detected as SLA BREACHED at 11:00
  ✅ PASS: KnownIssueService accurately identifies KI-208 and KI-211 from ticket symptoms
  ✅ PASS: State-changing action is NOT executed before confirmation; Rejection leaves state unchanged
  ✅ PASS: State-changing action executes on confirmation, mutates DB state and creates audit record

========================================
Test Results: 12 / 12 tests passed (100%)
========================================
🎉 ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY!
```

---

## 📡 Backend REST API Endpoints

| Method | Endpoint | Description | RBAC Scope |
|---|---|---|---|
| `GET` | `/api/auth/me` | Current authenticated user identity | Public/Session |
| `GET` | `/api/auth/identities` | Switchable demo personas | Public |
| `POST` | `/api/auth/switch-session` | Switch active persona session | Public |
| `GET` | `/api/accounts` | List accounts | Scoped (Customer sees own; Internal sees all) |
| `GET` | `/api/orders` | List order records | Scoped |
| `GET` | `/api/orders/:id/cancellation-estimate` | Pre-calculate cancellation fee | Scoped |
| `GET` | `/api/orders/:id/credit-estimate` | Pre-calculate service credit | Scoped |
| `GET` | `/api/tickets` | List support tickets | Scoped |
| `GET` | `/api/documents` | Search policies and agreements | Scoped (Agreements isolated) |
| `GET` | `/api/known-issues` | List known product issues | All |
| `GET` | `/api/audit-logs` | Immutable audit trail | Scoped |
| `POST` | `/api/agent/query` | Multi-step agent reasoning loop | Authenticated |
| `POST` | `/api/actions/prepare` | Prepare state change (HITL phase 1) | Authenticated |
| `POST` | `/api/actions/:id/confirm` | Execute state mutation (HITL phase 2) | Authorized |
| `POST` | `/api/actions/:id/reject` | Reject state mutation | Authorized |
| `GET` | `/api/proactive/radar` | Dynamic SLA, bug, and outage insights | Internal / All |
| `GET` | `/api/trust/hierarchy` | 5-tier precedence hierarchy | All |
| `GET` | `/api/events` | Server-Sent Events real-time stream | All |

---

## 📁 Repository Structure

```
parcelpilot-ai-support/
├── backend/
│   ├── config.js               # Environment config, snapshot timestamp, demo users
│   ├── db/
│   │   ├── schema.sql          # SQLite schema (9 tables)
│   │   ├── database.js         # SQLite connection manager (WAL mode)
│   │   └── seed.js             # Authoritative seeder from candidate data pack
│   ├── middleware/
│   │   ├── auth.js             # RBAC and tenant isolation guard with audit logging
│   │   └── error.js            # Centralized error handler
│   ├── services/
│   │   ├── eventEmitter.js     # SSE real-time broadcast engine
│   │   ├── documentService.js  # Knowledge base search & metadata weighting
│   │   ├── precedenceService.js# 5-tier precedence conflict resolver
│   │   ├── calculationService.js# Deterministic cancellation fee & credit calculators
│   │   ├── knownIssueService.js # Deterministic NLP symptom & signal matcher
│   │   ├── proactiveService.js # SLA breach tracker, outage detector & credit liability
│   │   ├── actionService.js    # Two-phase transaction engine (prepare/confirm)
│   │   └── agentService.js     # Multi-step agent orchestrator (LLM + Rule Engine)
│   ├── routes/                 # REST API route handlers
│   └── server.js               # Express server bootstrap
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Header, persona switcher, live sync badge, theme
│   │   │   ├── ChatInterface.jsx# Multi-turn conversational UI with tool execution trace
│   │   │   ├── ActionCard.jsx  # Interactive Human-In-The-Loop confirmation card
│   │   │   ├── ProactiveRadar.jsx# Problem 1: Anomaly, bug cluster & SLA radar
│   │   │   ├── TrustMatrix.jsx # Problem 2: 5-tier precedence hierarchy & conflict solver
│   │   │   ├── DataExplorer.jsx# Live SQLite tables for orders, tickets, logs
│   │   │   └── DocumentViewer.jsx# Searchable reader for 6 candidate pack PDFs
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Session state, theme, SSE subscriber
│   │   ├── styles/
│   │   │   └── index.css       # Glassmorphism dark/light stylesheet
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js          # Vite configuration with API proxy
│   └── package.json
├── docs/
│   ├── ARCHITECTURE_NOTE.md    # 5-part architecture document
│   ├── PRODUCT_NOTE.md         # Product strategy & future roadmap
│   └── AI_TOOLS_NOTE.md        # AI tools disclosure note
├── tests/
│   └── backend.test.js         # 12 automated test suites
├── .env.example
└── package.json
```

---

## 📄 Submission Documents
- [Architecture Note](file:///C:/Users/behem/.gemini/antigravity-ide/scratch/parcelpilot-ai-support/docs/ARCHITECTURE_NOTE.md)
- [Product Note](file:///C:/Users/behem/.gemini/antigravity-ide/scratch/parcelpilot-ai-support/docs/PRODUCT_NOTE.md)
- [AI Tools Note](file:///C:/Users/behem/.gemini/antigravity-ide/scratch/parcelpilot-ai-support/docs/AI_TOOLS_NOTE.md)
