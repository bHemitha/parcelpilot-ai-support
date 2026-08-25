/**
 * Authority & Precedence Resolution Service for ParcelPilot
 * 
 * Strict Hierarchy:
 * Tier 1 (Highest): Signed Customer Agreement (Account-specific contracts)
 * Tier 2 (High): Current General Support Policy v3 & Cancellation SOP v4
 * Tier 3 (Medium): Current Product Operations Guide (Specs & active KIs)
 * Tier 4 (Blocked): Deprecated Support Policy v2 (Warning: Must NOT be used for current actions)
 * Tier 5 (Context Only): Historical Tickets & Resolutions (Unreliable precedent, never policy authority)
 */

export class PrecedenceService {
  static AUTHORITY_TIERS = {
    AGREEMENT: { level: 1, name: 'Signed Customer Agreement', badge: 'Tier 1 - Highest Authority', trust: 'VERIFIED_CONTRACT' },
    CURRENT_POLICY: { level: 2, name: 'Current General Policy / SOP (v3/v4)', badge: 'Tier 2 - Authoritative Policy', trust: 'AUTHORITATIVE' },
    OPS_GUIDE: { level: 3, name: 'Product Operations Guide', badge: 'Tier 3 - Product & Ops Guide', trust: 'OPERATIONAL_GUIDE' },
    DEPRECATED_POLICY: { level: 4, name: 'Deprecated Support Policy (v2)', badge: 'Tier 4 - Deprecated (Blocked)', trust: 'DEPRECATED_BLOCKED' },
    HISTORICAL_TICKET: { level: 5, name: 'Historical Ticket / Agent Notes', badge: 'Tier 5 - Historical Context Only', trust: 'UNTRUSTED_CONTEXT' }
  };

  /**
   * Resolve conflict between multiple sources
   * @param {Array} candidateSources - list of source items or clauses
   * @param {string} context - topic (e.g. 'cancellation_fee', 'sla_target', 'service_credit', 'bulk_upload_limit')
   * @param {string} accountId - target account ID
   */
  static resolveConflict(candidateSources, context, accountId) {
    const sorted = [...candidateSources].sort((a, b) => a.authorityLevel - b.authorityLevel);
    
    const winningSource = sorted[0];
    const conflictingSources = sorted.slice(1);

    const deprecatedDetected = candidateSources.some(s => s.status === 'DEPRECATED' || s.authorityLevel === 4);
    const historicalContradiction = candidateSources.some(s => s.authorityLevel === 5 && s.contradictsCurrentPolicy);

    let explanation = `Resolved using Tier ${winningSource.authorityLevel} (${winningSource.title}).`;
    
    if (winningSource.authorityLevel === 1) {
      explanation += ` Customer-specific agreement for ${accountId} overrides general company policies and standard SOPs.`;
    } else if (winningSource.authorityLevel === 2) {
      explanation += ` Standard current policy applies because no customer-specific agreement override exists for this account.`;
    }

    if (deprecatedDetected) {
      explanation += ` [GUARD ACTIVATED: Deprecated Support Policy v2 was excluded from decision-making as superseded by Policy v3.]`;
    }

    if (historicalContradiction) {
      explanation += ` [TRUST WARNING: Historical ticket guidance contained past agent error and was rejected in favor of verified current policy.]`;
    }

    return {
      selectedSource: winningSource,
      rejectedSources: conflictingSources,
      authorityLevel: winningSource.authorityLevel,
      trustBadge: winningSource.trustBadge,
      explanation,
      confidence: winningSource.authorityLevel <= 2 ? 0.98 : 0.85,
      auditTrail: {
        evaluatedTiers: candidateSources.map(s => ({
          title: s.title,
          tier: s.authorityLevel,
          status: s.status,
          decision: s.title === winningSource.title ? 'ACCEPTED_GOVERNING' : 'SUPERSEDED_REJECTED'
        }))
      }
    };
  }

  /**
   * Returns static overview of hierarchy for the Trust Matrix UI
   */
  static getHierarchyDefinition() {
    return {
      tiers: [
        {
          tier: 1,
          name: 'Signed Customer Agreements',
          authority: 'Highest Authority',
          appliesTo: 'Specific Account (e.g. Northstar ACCT-001, LumenWorks ACCT-002)',
          description: 'Legally binding signed contracts that supersede all standard ParcelPilot policies, SLAs, credit caps, and fee structures.',
          status: 'ACTIVE',
          badgeColor: 'emerald',
          examples: ['Northstar Enterprise Agreement (waives all pre-pickup cancellation fees, 15m P1 SLA)', 'LumenWorks Service Agreement (fixed INR 300 credit on >4h delay)']
        },
        {
          tier: 2,
          name: 'Current Support Policy & SOPs',
          authority: 'Authoritative Standard',
          appliesTo: 'All accounts lacking specific contract clauses',
          description: 'Official active company operational guidelines: Support Policy v3 (effective 1 May 2026) and Cancellation & Service Credit SOP v4 (effective 15 June 2026).',
          status: 'CURRENT',
          badgeColor: 'blue',
          examples: ['Support Policy v3: Standard P1 SLA = 4h, Enterprise = 30m', 'SOP v4: INR 250 cancellation fee after 30 mins; failed pickup credit = min(500, 10% fee) on >2h delay']
        },
        {
          tier: 3,
          name: 'Product Operations Guide & Active KIs',
          authority: 'Operational Reference',
          appliesTo: 'Platform-wide feature capabilities and active bug tracking',
          description: 'Live operational documentation detailing tier capacities (Growth/Enterprise up to 5,000 CSV rows) and active Known Issues (KI-208, KI-211).',
          status: 'CURRENT',
          badgeColor: 'amber',
          examples: ['Bulk CSV limit is 5,000 rows (Growth/Enterprise)', 'KI-208: CSV uploads >3,000 rows experience intermittent 70% failure']
        },
        {
          tier: 4,
          name: 'Deprecated Policies (Policy v2)',
          authority: 'DEPRECATED - BLOCKED',
          appliesTo: 'Historical reference only',
          description: 'Obsolete policy documents (e.g. Support Policy v2, superseded 1 May 2026). The AI agent is strictly prohibited from applying deprecated rules.',
          status: 'DEPRECATED',
          badgeColor: 'rose',
          examples: ['Support Policy v2 (Enterprise P1 SLA was 1 hour - now 30 minutes in v3)']
        },
        {
          tier: 5,
          name: 'Historical Tickets & Resolutions',
          authority: 'Context Only (Untrusted Precedent)',
          appliesTo: 'Past case history',
          description: 'Past agent conversations and resolutions. These are treated strictly as reference context and may contain past human error or obsolete logic.',
          status: 'UNTRUSTED_CONTEXT',
          badgeColor: 'purple',
          examples: ['TKT-450: Agent mistakenly told Northstar INR 250 fee applied', 'TKT-451: Agent mistakenly told LumenWorks Growth plan only supports 3,000 rows']
        }
      ],
      governanceRules: [
        'Customer Agreement always trumps General Policy for that account.',
        'Policy v3 supersedes Policy v2 completely.',
        'Historical tickets must never override current policy or signed agreements.',
        'Any state-changing action requires explicit human confirmation before DB mutation.',
        'Credits above INR 1,000 require Ops Lead / Manager authorization.'
      ]
    };
  }
}
