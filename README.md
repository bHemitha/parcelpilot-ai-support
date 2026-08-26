# ?? ParcelPilot AI Support & Operations Platform

> **CalQuity AI Systems Engineer Assessment Submission**  
> An enterprise-grade, multi-persona AI agent platform featuring **Strict Data Pack Knowledge Boundary**, **5-Tier Precedence Hierarchy**, **Data-Layer RBAC Isolation**, **2-Phase Human-in-the-Loop (HITL) State Mutation**, and **Real-Time Proactive Operations Radar**.

---

## ?? Live Application & Repository Links

* **Live Hosted Application (Render):** [https://parcelpilot-ai-support-twea.onrender.com](https://parcelpilot-ai-support-twea.onrender.com)
* **Public GitHub Repository:** [https://github.com/bHemitha/parcelpilot-ai-support](https://github.com/bHemitha/parcelpilot-ai-support)
* **Assessment Submission Form:** [https://forms.gle/hLGBrDrNRmK7UAbv6](https://forms.gle/hLGBrDrNRmK7UAbv6)
* **Dataset Reference Snapshot Time:** `2026-08-16 11:00:00+05:30` (Asia/Kolkata)

---

## ??? 1. Solution Architecture & System Design

```
                                  +--------------------------------+
                                  |   USER QUERY / PERSONA CONTEXT |
                                  +---------------+----------------+
                                                  |
                                                  v
                         +--------------------------------------------------+
                         |      STAGE 1: DOMAIN & SCOPE CLASSIFIER          |
                         +--------------------------------------------------+
                         |  * Case A: ParcelPilot Topic but Missing in Pack  |
                         |    -> Refuse hallucination with standard notice  |
                         |  * Case B: Out-of-Scope (General / Non-Logistics) |
                         |    -> Refuse general LLM exposure                |
                         |  * Case C: Valid ParcelPilot Domain Query        |
                         +------------------------+-------------------------+
                                                  |
                                                  v
                         +--------------------------------------------------+
                         |         STAGE 2: DATA-LAYER RBAC GUARD           |
                         +--------------------------------------------------+
                         |  * Customer Scope: WHERE account_id = session.id |
                         |  * Cross-Tenant Breach -> 403 Forbidden          |
                         |  * Prompt Injection Immunity: Tokens verified DB |
                         +------------------------+-------------------------+
                                                  |
                                                  v
                         +--------------------------------------------------+
                         |       STAGE 3: MULTI-SOURCE TOOL DISPATCHER      |
                         +------------------------+-------------------------+
                         | 1. document_search     | 2. structured_query     |
                         |    (6-PDF SQLite FTS)  |    (Orders/Tickets DB)  |
                         | 3. calculation_engine  | 4. state_action_prep    |
                         |    (Contract Math)     |    (2-Phase Tokens)     |
                         +------------------------+-------------------------+
                                                  |
                                                  v
                         +--------------------------------------------------+
                         |   STAGE 4: 5-TIER SOURCE PRECEDENCE RESOLUTION   |
                         +--------------------------------------------------+
                         |  Tier 1: Signed Customer Agreements (Binding L1) |
                         |  Tier 2: Current SOPs & Support Policy v3 (L2)   |
                         |  Tier 3: Product Ops Guide & Known Issues (L3)   |
                         |  Tier 4: Deprecated Policies e.g. Policy v2 (L4) |
                         |  Tier 5: Historical Support Tickets (Context L5) |
                         +------------------------+-------------------------+
                                                  |
                                                  v
                         +--------------------------------------------------+
                         |   STAGE 5: GROUNDED REASONING & RESPONSE GEN     |
                         +--------------------------------------------------+
                         |  * Strict Evidence-Grounded Answer Formatting    |
                         |  * Authority Trust Badges (Tier 1-5)             |
                         |  * Real Multi-Step Tool Execution Trace          |
                         |  * Interactive 2-Phase Action Confirmation Card  |
                         +--------------------------------------------------+
```

---

## ??? 2. Minimum Requirements Verification

| Requirement | Implementation Details | Test Verification |
| :--- | :--- | :--- |
| **1. Chatbot & Natural Language** | Dual persona support (Customer vs Internal Admin/Ops). Grounds strictly on 6 supplied PDFs & SQLite dataset. Zero LLM hallucinations. | Verified across 60 automated tests. |
| **2. RBAC & Data Privacy** | Data-layer SQL filtering (`WHERE account_id = ?`). Blocks cross-tenant access with `403 Tenant Scope Violation`. | `Show me LumenWorks ORD-2001` (Northstar) -> 403 Forbidden. |
| **3. Three Distinct Agent Tools** | `document_search` (PDF FTS), `structured_query` / `financial_calculator` (Orders, Tickets, SLAs), `state_action` (Escalations, Cancellations). | Full tool trace visible in UI. |
| **4. Confirmation Before Actions** | 2-phase confirmation card with cryptographic token (`CONF-...`). Zero database mutation until explicit approval. Blocks double-execution (`ALREADY_PROCESSED`). | Tested with Approve, Reject, and Replay attacks. |
| **5. Multi-Step Reasoning** | Combines DB state lookup + Customer Contract + SOP + Precedence + Calculation. | Northstar cancellation (?0 waiver), LumenWorks delay (?300 credit). |
| **6. Clean SaaS Interface** | Dual-panel layout (Agent Chat + Context Panel/Radar), tool execution trace dropdown, responsive cards. | Deployed live on Render. |
| **7. 5-Minute Technical Demo Video** | Full video walkthrough covering architecture, live queries, HITL actions, and radar. | [Video Link in Submission] |

---

## ?? 3. Two Additional Client Problems Addressed

### Problem 1: Proactive Issue Detection (Operations Radar)
* **Automated SLA Breach Monitor:** Live tracking against customer-specific contractual targets (e.g. `TKT-501` Northstar 15m P1 target vs standard 30m/120m).
* **Security Anomaly Radar:** Detects critical security threats (e.g. `TKT-505` potential API key exposure).
* **Known Issue Clustering:** Automatically correlates tenant support tickets to active engineering known issues (`TKT-502` -> `KI-208` Bulk CSV timeout >3k rows; `TKT-504` -> `KI-211` SwiftShip 20m webhook delay; `TKT-503` -> `KI-304` RoadRunner payload truncation).
* **Real-time Synchronization:** Powered by Server-Sent Events (SSE) to update radar cards immediately when actions occur in chat.

### Problem 2: Trust & Reliability (5-Tier Authority Framework)
* **Tier 1 (Highest Authority):** Signed Customer Agreements (*Northstar Enterprise Agreement*, *LumenWorks Service Agreement*).
* **Tier 2 (Authoritative Active Policy):** *Support Policy v3*, *Cancellation & Service Credit SOP v4*.
* **Tier 3 (Authoritative Operational Guide):** *Product Operations Guide & Known Issues* (`KI-208`, `KI-211`, `KI-304`).
* **Tier 4 (Deprecated / Non-Governing):** *Support Policy v2* (Flagged as non-governing; never treated as current authority).
* **Tier 5 (Low Reliability / Historical Context Only):** *Historical Support Tickets* (Explicitly refuted when contradicting Tier 1 contracts or Tier 2 policies).

---

## ?? 4. Future Roadmap & Scaled Enterprise Architecture

For scaling ParcelPilot or building an enterprise-grade Policy Assistant over 50+ corporate PDFs, we propose the following production architecture:

### 1. Enterprise Vector & Hybrid Retrieval Stack
* **Vector DB / Storage:** **PostgreSQL with `pgvector`** or **Qdrant**.
  * *Rationale:* ACID compliance, relational metadata filtering (tenant ID, department, effective date) combined with HNSW vector indexing.
* **Embedding Model:** **`text-embedding-3-large`** or **`bge-large-en-v1.5`** with 512-token semantic chunking and 20% sliding window overlap.
* **Hybrid Search:** Reciprocal Rank Fusion (RRF) combining dense vector similarity with sparse BM25 keyword search.

### 2. Answering Prompt & Conflict Resolution Engine
```markdown
You are the Authoritative Enterprise Policy Assistant.
Rules:
1. ONLY answer using facts from the retrieved context.
2. Provide exact inline citations for every statement: [Document ID, Section Number, Authority Tier].
3. Precedence Resolution: If Document A (Individual Agreement/Newer SOP) conflicts with Document B (Generic/Deprecated Policy), apply Tier 1 > Tier 2 > Tier 3 > Tier 4 and explain which document supersedes the other.
4. Refusal: If the retrieved documents do not contain the answer, return:
   "I can't answer that reliably from the supplied knowledge base because the required information is not available in the provided documents."
```

### 3. Continuous RAG Evaluation Matrix (The 6 Automated Evals)
| Category | Test Input Scenario | Success Criteria | Evaluation Method |
| :--- | :--- | :--- | :--- |
| **1. Exact-Fact Recall** | "What is Northstar's P1 SLA?" | Output contains "15 minutes" and cites Section 1. | Auto-graded (Regex / Substring). |
| **2. Multi-Document Synthesis** | "Can Northstar cancel ORD-1001?" | Synthesizes ORD-1001 status + Contract Sec 2 waiver (?0 fee). | Auto-graded + LLM Judge. |
| **3. Refusal of Out-of-Scope** | "What is binary search?" | Returns standard out-of-scope refusal message. | Auto-graded (Exact Template Match). |
| **4. Citation Correctness** | "What is the bulk CSV limit?" | Sourced to *Product Operations Guide*, Tier 3. | Auto-graded (Citation Validator). |
| **5. Hallucination Detection** | "What is employee vacation policy?" | Refuses with "not available in provided documents". | Auto-graded (Zero Unsupported Claims). |
| **6. Conflict Handling** | Historical ticket vs Agreement | Explicitly states Agreement (Tier 1) overrides Ticket (Tier 5). | LLM-as-a-Judge (Rubric Scored). |

### 4. Failure Modes & Automated Recovery
1. **Failure Mode 1: Retrieval Semantic Drift (Query-Document Lexical Mismatch)**
   * *Signal:* Max cosine similarity score < 0.62 across top-5 chunks.
   * *Recovery:* Multi-Query Expansion & HyDE (Hypothetical Document Embeddings) fallback.
2. **Failure Mode 2: Stale Document Contradiction (Multiple Active Versions)**
   * *Signal:* Conflict detector identifies contradicting numerical thresholds across retrieved chunks.
   * *Recovery:* Strict metadata effective-date sorting and Precedence Tier filtering.
3. **Failure Mode 3: Context Overflow & Token Starvation**
   * *Signal:* Retrieved context exceeds 70% of LLM attention budget.
   * *Recovery:* Extractive summarization & Cross-Encoder re-ranking (`bge-reranker-large`) to prune to top-3 highest-scoring passages.

---

## ?? 5. Product Metrics & Evaluation

* **North Star Metric:** **First-Contact Resolution Accuracy (FCRA)**
  * *Definition:* The percentage of support inquiries resolved with zero policy contradictions, zero RBAC leaks, and zero subsequent human overrides.
* **Secondary Metrics:**
  * **Mean Time to Action Confirmation (MTTAC):** Time taken from action proposal to operator execution.
  * **Zero-Hallucination Rate:** 100% adherence to strict data pack boundaries on unanswerable queries.

---

## ?? 6. Local Setup & Testing Instructions

### Prerequisites
* **Node.js:** v18.0.0+ (Tested on v24.19.0)
* **npm:** v9.0.0+

### Installation & Run Commands
```powershell
# 1. Clone repository
git clone https://github.com/bHemitha/parcelpilot-ai-support.git
cd parcelpilot-ai-support

# 2. Install dependencies & Seed SQLite Database
npm install
node backend/db/seed.js

# 3. Run Automated Comprehensive Test Suite
npm test

# 4. Build Production Frontend Bundle
npm run build

# 5. Start Server
npm start
```
* Open browser: `http://localhost:3000`