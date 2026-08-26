# ?? Enterprise Policy Assistant Case Study ? Evals & Failure Recovery

> **Context:** Designing a Scaled Enterprise Policy Assistant across 50+ Corporate PDFs (HR, IT Security, Finance, Travel, Legal) with strict citation enforcement, automated evals, and failure recovery.

---

## 1. Concrete Architecture Stack
- **Vector Storage:** **PostgreSQL with `pgvector`** (HNSW index, relational metadata filtering by `tenant_id`, `department`, `effective_date`, `authority_tier`).
  * *Rationale:* Combines relational ACID transaction guarantees with sub-10ms vector search.
- **Embedding Model:** **`bge-large-en-v1.5`** or **`text-embedding-3-large`** with 512-token semantic chunking and 20% sliding window overlap.
  * *Rationale:* State-of-the-art MTEB retrieval performance across dense legal/technical text.
- **Hybrid Retrieval:** Reciprocal Rank Fusion (RRF) combining dense cosine similarity with sparse BM25 keyword search.
- **Re-ranking:** **`bge-reranker-large`** cross-encoder pruning top-25 candidate passages down to top-5 highest-scoring contexts.

---

## 2. Production Generation Prompt
```text
You are the Authoritative Enterprise Policy Assistant.

OPERATING CONSTRAINTS:
1. ONLY answer using explicit facts directly stated in the retrieved context.
2. In-line Citations: For EVERY claim, cite [Doc ID, Section Number, Authority Tier].
3. Conflict Resolution: If Document A (Customer Contract / Specific SOP) conflicts with Document B (General / Older Policy), apply Tier 1 (Agreement) > Tier 2 (Active SOP) > Tier 3 (Ops Guide) > Tier 4 (Deprecated) and explain which document wins.
4. Refusal Rule: If the answer is not present in the retrieved context, return:
   "I can't answer that reliably from the supplied knowledge base because the required information is not available in the provided documents."
5. Output Schema: Structured Markdown with Answer, Why/Precedence, and Evidence List.
```

---

## 3. Python Implementation Skeleton
```python
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class PolicyCitation(BaseModel):
    doc_id: str
    section: str
    tier: int
    confidence: float

class PolicyResponse(BaseModel):
    answer: str
    citations: List[PolicyCitation]
    precedence_applied: Optional[str]
    confidence_score: float
    refusal: bool = False

class EnterprisePolicyPipeline:
    def __init__(self, vector_store, reranker, llm_client):
        self.vector_store = vector_store
        self.reranker = reranker
        self.llm_client = llm_client

    async def execute(self, query: str, tenant_id: str, user_role: str) -> PolicyResponse:
        # Step 1: Hybrid Retrieval with Metadata Filtering
        dense_candidates = await self.vector_store.dense_search(query, tenant_id=tenant_id, k=25)
        sparse_candidates = await self.vector_store.bm25_search(query, tenant_id=tenant_id, k=25)
        merged_chunks = self.reciprocal_rank_fusion(dense_candidates, sparse_candidates)

        # Step 2: Cross-Encoder Reranking
        top_chunks = await self.reranker.rank(query, merged_chunks, top_n=5)
        
        # Step 3: Evidence Sufficiency Check
        if not top_chunks or top_chunks[0].score < 0.60:
            return PolicyResponse(
                answer="I can't answer that reliably from the supplied knowledge base because the required information is not available in the provided documents.",
                citations=[],
                confidence_score=0.0,
                refusal=True
            )

        # Step 4: Grounded Answer Generation
        response = await self.llm_client.generate(query=query, context=top_chunks)
        return response
```

---

## 4. Continuous Evaluation Matrix (The 6 Automated Evals)
| Category | Test Scenario | Success Criteria | Evaluation Method |
| :--- | :--- | :--- | :--- |
| **1. Exact-Fact Recall** | "What is the daily meal limit for international travel?" | Returns exact numerical limit ($75/day) & cites Finance Policy Sec 4. | **Auto-Graded** (Regex / String match) |
| **2. Multi-Doc Synthesis** | "Can I use my personal laptop during remote client visits?" | Combines IT Security BYOD Policy + Remote Work SOP. | **Auto-Graded + LLM Judge** |
| **3. Out-of-Scope Refusal** | "What is the weather in Seattle?" | Returns standard refusal template with zero general LLM exposure. | **Auto-Graded** (Template validator) |
| **4. Citation Correctness** | "What is the expense approval threshold?" | Grounded citations match source chunk document ID & section. | **Auto-Graded** (AST Citation parser) |
| **5. Hallucination Detection** | "What is the executive stock grant schedule?" | Returns "Information not available in provided documents". | **Auto-Graded** (Unsupported Claim check) |
| **6. Conflict Handling** | Executive contract waiver vs Standard travel policy | Explicitly states Executive Contract (Tier 1) overrides Standard Policy (Tier 2). | **LLM-as-a-Judge** (Rubric evaluation) |

---

## 5. Failure Modes & Automated Recovery
1. **Failure Mode 1: Retrieval Semantic Drift (Vocabulary Mismatch)**
   * *Signal:* Max re-ranker score < 0.62 across top-5 candidates.
   * *Fallback:* Query Decomposition + HyDE (Hypothetical Document Embeddings) fallback search.
2. **Failure Mode 2: Multi-Version Document Contradictions**
   * *Signal:* Conflict detector flags identical section numbers across different publication dates.
   * *Fallback:* Strict metadata filter restricting retrieval to `status = 'ACTIVE'` and sorting by `effective_date DESC`.
3. **Failure Mode 3: Context Overflow & Token Starvation**
   * *Signal:* Combined candidate passages exceed 70% of model context window.
   * *Fallback:* Extractive summarization per chunk before generation prompt construction.

---

## 6. Client Product Owner Message (~150 words)
> *"Hi Sarah, we've delivered v1 of your Enterprise Policy Assistant. It accurately answers daily policy questions across your 50 PDFs with verified in-line citations and deterministic source precedence (e.g. custom agreements strictly overriding generic SOPs). In v1, it intentionally refuses queries where policy text is ambiguous or absent to ensure zero hallucinated rules. To make v2 materially faster and more autonomous, we recommend two document hygiene steps: 1) Assign a designated document owner per policy with explicit effective/sunset dates in document metadata, and 2) Deprecate older policy versions so the engine always indexes a single source of truth. Looking forward to reviewing the live pilot with your team!"*