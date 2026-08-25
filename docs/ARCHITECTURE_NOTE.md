# ParcelPilot Architecture Note

## 1. Agent Design

The ParcelPilot AI Support & Operations system is built around a **Hybrid Multi-Step Reasoning Architecture** with dual execution capabilities:

1. **Deterministic Precedence & Policy Engine (Offline / Standalone Mode):** Operates on formal rule evaluators, syntax/semantic entity extractors, and strict conflict resolvers. This guarantees 100% deterministic, testable, and correct responses for compliance-critical financial and contractual calculations without reliance on external network APIs.
2. **LLM Synthesis & Reasoning Engine (Gemini API Enabled):** When `GEMINI_API_KEY` is provided, natural language queries undergo rich conversational synthesis and tool parameterization, while all tool outputs, calculations, and authorization decisions remain strictly governed by the backend database and rule validators.

### Agent Execution Trace Pipeline
Every agent request executes through a transparent, 6-stage operational pipeline:
```
User Query
    ↓
1. RBAC Security Guard (Validates token, extracts tenant scope & user role)
    ↓
2. Intent & Entity Extraction (Identifies intent, Order IDs, Ticket IDs, carriers)
    ↓
3. Document Search Tool (Retrieves policies, SOPs, and signed contracts from SQLite)
    ↓
4. Structured Data Query Tool (Fetches real-time order/ticket/account state)
    ↓
5. Precedence & Conflict Resolver (Applies 5-tier legal hierarchy)
    ↓
6. Financial / SLA Calculator (Computes exact INR cancellation fees & service credits)
    ↓
7. State-Action Engine (Creates PENDING_CONFIRMATION transaction card if mutation needed)
    ↓
Final Answer Synthesis & Citation Badges
```

---

## 2. Tool Design

The agent integrates three primary distinct tools, supplemented by security and monitoring services:

### Tool 1: `document_search`
- **Purpose:** Searches policies, agreements, SOPs, and product guides from the SQLite `documents` table.
- **RBAC Scoping:** Automatically filters out other customer agreements when the user is a `customer` persona (e.g. Northstar cannot see LumenWorks agreement).
- **Metadata Weighting:** Boosts active and customer-specific documents while penalizing or guarding deprecated sources.

### Tool 2: `structured_query` & `financial_calculator`
- **Purpose:** Queries live transactional data across `orders`, `tickets`, and `accounts`.
- **Calculations:**
  - `calculateCancellation(orderId, accountId)`: Evaluates elapsed booking time against standard SOP (INR 0 within 30m, INR 250 after 30m) vs contractual waivers (Northstar: INR 0 always before pickup).
  - `calculateServiceCredit(orderId)`: Evaluates late pickup duration against snapshot time (`2026-08-16 11:00 AM IST`), carrier fault, customer fault, and contractual overrides (LumenWorks: fixed INR 300 on >4h delay).
  - `slaMonitor`: Compares ticket creation time vs contracted SLA targets (e.g., Northstar P1 = 15 mins, Enterprise = 30 mins).

### Tool 3: `state_action` (Two-Phase Human-In-The-Loop Execution)
- **Purpose:** Manages state mutations (Order cancellations, Service credit issuances, Ticket escalations, Priority changes, Assignments).
- **Safety Mechanism:** Actions are **never** executed autonomously upon initial proposal. The engine prepares a transaction with a unique confirmation token (`PENDING_CONFIRMATION`). The frontend displays an interactive `ActionCard` with impact, justification, and approval buttons. Only upon user approval (`POST /api/actions/:id/confirm`) is the transaction executed in SQLite, an immutable audit log recorded, and an SSE event broadcasted.

---

## 3. Document and Structured Data Handling

- **Persistent Database:** Backed by SQLite (`better-sqlite3`) in write-ahead logging (`WAL`) mode with foreign key constraints.
- **Reference Snapshot Anchor:** All time-based calculations reference the standardized assignment timestamp `2026-08-16T11:00:00+05:30`.
- **Data Isolation:** All data access enforces tenant filtering at the database layer (`WHERE account_id = ?`) rather than relying on frontend UI filtering.

---

## 4. Source Reliability and Conflict Handling

ParcelPilot enforces an explicit **5-Tier Authoritative Precedence Hierarchy**:

| Tier | Category | Authority Level | Trust Level | Conflict Behavior |
|---|---|---|---|---|
| **Tier 1** | **Signed Customer Agreements** | Highest | `VERIFIED_CONTRACT` | Overrides general company policies for that specific account. |
| **Tier 2** | **Current Support Policy v3 & SOP v4** | High (Standard) | `AUTHORITATIVE` | Applies to all accounts lacking custom contract clauses. |
| **Tier 3** | **Product Operations Guide & Active KIs** | Operational Reference | `OPERATIONAL_GUIDE` | Governs technical limits (5,000 CSV rows) and known bugs. |
| **Tier 4** | **Deprecated Support Policy v2** | Blocked | `DEPRECATED_BLOCKED` | Strictly prohibited from governing current requests; warning issued. |
| **Tier 5** | **Historical Tickets & Past Resolutions** | Informational Context | `UNTRUSTED_CONTEXT` | Untrusted precedent; rejected if in contradiction with Tiers 1–3. |

### Concrete Resolution Examples:
1. **Northstar Pre-Pickup Cancellation:**
   - *Conflict:* SOP v4 charges INR 250 after 30 minutes; Historical ticket TKT-450 wrongly charged INR 250; Northstar Agreement Section 2 waives all pre-pickup fees.
   - *Decision:* Tier 1 Agreement wins. Cancellation Fee = **INR 0**.
2. **LumenWorks Delayed Pickup Credit:**
   - *Conflict:* SOP v4 gives `min(500, 10% fee)` on >2h delay; LumenWorks Agreement Section 3 gives fixed INR 300 on >4h delay.
   - *Decision:* Tier 1 Agreement wins. Credit = **INR 300**.
3. **Growth Plan Bulk CSV Upload Limit:**
   - *Conflict:* Product Operations Guide Section 1 states 5,000 rows limit; Historical ticket TKT-451 claimed 3,000 rows limit.
   - *Decision:* Tier 3 Guide wins. 5,000 rows is supported limit; failure is due to Known Issue KI-208.

---

## 5. Major Technical Trade-Offs

1. **SQLite (`better-sqlite3`) vs In-Memory Mocks:**
   - *Decision:* Selected SQLite for full relational persistence, ACID transactions, and zero-configuration local execution over ephemeral in-memory variables.
2. **Server-Sent Events (SSE) vs WebSockets:**
   - *Decision:* Selected SSE for one-way server-to-client real-time push synchronization. SSE is lighter, runs natively over HTTP without extra port configuration, and supports automatic reconnection with fallback.
3. **Deterministic Core + LLM Hybrid vs Pure LLM Prompting:**
   - *Decision:* Pure LLM prompting suffers from hallucination and mathematical inconsistency. ParcelPilot isolates calculations and security checks to deterministic services, using LLM strictly for conversational synthesis.
