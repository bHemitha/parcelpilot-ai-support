# ParcelPilot Product Note

## 1. Additional Client Problems Addressed

Beyond the minimum requirements, we tackled **both** additional client problems:

### Problem 1: Proactive Issue Detection & Operational Radar
A purely reactive chatbot forces customer operations teams to wait until customers submit complaints. To solve this, we designed the **Proactive Operations Radar** view for internal staff:
- **Real-Time Anomaly Clustering:**
  - *Outage & Critical Incidents:* Detects P1 issues like TKT-501 (Northstar HTTP 500 across all shipment creations) and flags SLA breaches in real-time.
  - *Active Known Bug Spike (KI-208):* Groups CSV bulk upload failure tickets (TKT-502 & historical TKT-451) and provides agents with actionable workarounds (<3,000 row batching).
  - *Carrier Status Sync Latency (KI-211):* Detects SwiftShip pickup confirmation lag (TKT-504) to prevent agents from mistakenly telling customers that pickups were missed.
  - *Security Alerts (TKT-505):* Flags exposed API credentials for immediate token revocation.
- **Dynamic SLA Monitor:** Continuously recalculates elapsed time versus contracted SLA targets (e.g. 15 mins for Northstar P1 vs 30 mins for standard Enterprise), highlighting overdue tickets in red.
- **Service Credit Liability Tracker:** Pre-computes pending failed-pickup credit liabilities (e.g., LumenWorks ORD-2002 INR 300) so finance and ops leads have full visibility over exposure.

### Problem 2: Trust and Reliability Engine
Financial and logistics institutions cannot tolerate confidently incorrect AI outputs. We solved this with:
- **Authoritative Precedence Matrix:** Explicit 5-tier source hierarchy where signed customer agreements strictly supersede general SOPs, and deprecated policies (Policy v2) and incorrect past tickets (TKT-450, TKT-451) are explicitly quarantined.
- **Trust Badges & Citation Footprints:** Every agent response displays the exact tier, source document, and clause used, ensuring full traceability.
- **Interactive Conflict Solver:** An interactive UI widget enabling teams to inspect how the engine evaluates and resolves conflicting clauses.

---

## 2. What Else We Would Build for ParcelPilot (Future Roadmap)

If continuing to develop ParcelPilot, we would prioritize:

1. **Automated Carrier API Webhook Integrations:**
   - Real-time bidirectional polling with BlueDart, SwiftShip, and RoadRunner APIs to auto-resolve webhook delays (KI-211) and automatically trigger failed-pickup credit eligibility without manual customer filing.
2. **Proactive Customer Notification Center:**
   - When KI-208 or KI-211 is detected, automatically surface an in-app banner to affected Growth/Enterprise users *before* they upload large CSVs or report delayed webhook statuses.
3. **Multi-Agent Human-in-the-Loop Collaboration Queue:**
   - Dedicated escalation routing with automated CSM reassignment for high-value strategic accounts (e.g., auto-assigning Northstar tickets to Priya Mehta).
4. **Automated Vector Embedding Pipeline:**
   - Hybrid semantic search combining dense vector embeddings with BM25 keyword filtering and metadata filtering for enterprise-scale document libraries.

---

## 3. What We Intentionally Left Out of the Submission

1. **Autonomous Direct Financial Execution:**
   - We intentionally required explicit Human-in-the-Loop confirmation for all financial transactions and order cancellations rather than allowing the AI to mutate monetary state autonomously.
2. **Complex External Auth Providers (OAuth / SSO):**
   - We implemented token-based demo identities and role-scoped session switching to ensure 100% friction-free local and evaluative testing without third-party OAuth setup bottlenecks.
3. **Heavy Distributed Queue Infrastructure:**
   - We used SQLite and Server-Sent Events (SSE) instead of Kafka/RabbitMQ to maintain a lightweight, zero-dependency deployment footprint that runs out of the box with `npm run dev`.

---

## 4. Primary Metric to Judge Product Usefulness

**Metric:** **First-Contact Resolution Rate (FCR) on Contractual & Policy Queries with 0% Hallucination Rate on Financial Penalties.**

*Why it matters:* For B2B logistics platforms, inaccurate cancellation fee assessments or SLA breaches directly damage enterprise customer trust and contractual compliance. Achieving high FCR while eliminating policy hallucinations delivers direct operational cost savings and maximizes customer retention.
