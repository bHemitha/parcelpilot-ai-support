import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Layers, Award, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function TrustMatrix() {
  const { currentUser } = useAuth();
  const [hierarchyData, setHierarchyData] = useState(null);
  const [activeCase, setActiveCase] = useState(0);

  useEffect(() => {
    async function loadHierarchy() {
      try {
        const res = await fetch('/api/trust/hierarchy');
        if (res.ok) {
          const data = await res.json();
          setHierarchyData(data);
        }
      } catch (err) {
        console.error('Failed to load trust hierarchy:', err);
      }
    }
    loadHierarchy();
  }, []);

  const conflictCases = [
    {
      title: 'Scenario A: Northstar Logistics Pre-Pickup Cancellation Fee',
      question: 'Can Northstar cancel BOOKED order ORD-1001 2 hours after booking without a fee?',
      sources: [
        { name: 'Northstar Enterprise Agreement (Section 2)', tier: 1, text: 'May cancel any BOOKED shipment before pickup with no fee.', decision: 'ACCEPTED_GOVERNING' },
        { name: 'Cancellation & Service Credit SOP v4 (Section 1)', tier: 2, text: 'Charge INR 250 fee after 30 minutes of booking.', decision: 'SUPERSEDED' },
        { name: 'Historical Ticket TKT-450 (12 July 2026)', tier: 5, text: 'Agent told Northstar INR 250 fee applied.', decision: 'REJECTED_AS_PAST_ERROR' }
      ],
      outcome: 'Fee: INR 0 (Waived). Tier 1 contract overrides standard SOP v4 and historical agent error.'
    },
    {
      title: 'Scenario B: LumenWorks Failed-Pickup Service Credit Calculation',
      question: 'Is LumenWorks eligible for a service credit when RoadRunner pickup is 4.5 hours late?',
      sources: [
        { name: 'LumenWorks Service Agreement (Section 3)', tier: 1, text: 'Fixed INR 300 credit if pickup delay > 4 hours with carrier fault.', decision: 'ACCEPTED_GOVERNING' },
        { name: 'Cancellation & Service Credit SOP v4 (Section 2)', tier: 2, text: 'Default credit is lower of INR 500 or 10% shipment fee (INR 240) on >2h delay.', decision: 'SUPERSEDED' }
      ],
      outcome: 'Credit: Fixed INR 300. Contract clause Section 3 replaces standard SOP calculation formula.'
    },
    {
      title: 'Scenario C: Growth Plan Bulk CSV Upload Limit',
      question: 'What is the maximum supported CSV row limit for LumenWorks bulk uploads?',
      sources: [
        { name: 'Product Operations Guide (Section 1)', tier: 3, text: 'Bulk upload is officially supported up to 5,000 rows per CSV on Growth and Enterprise plans.', decision: 'ACCEPTED_GOVERNING' },
        { name: 'Historical Ticket TKT-451 (11 Aug 2026)', tier: 5, text: 'Agent told customer Growth plan only supports 3,000 rows.', decision: 'REJECTED_AS_PAST_ERROR' },
        { name: 'Known Issue KI-208', tier: 3, text: 'Active bug causes failures >3,000 rows. Workaround: split files.', decision: 'ACTIVE_INVESTIGATION' }
      ],
      outcome: 'Official limit is 5,000 rows. KI-208 is an active software bug, not a plan restriction.'
    }
  ];

  const tiers = hierarchyData?.tiers || [];

  return (
    <div className="full-view-pane">
      <div className="page-header">
        <h2 className="page-title">🛡️ Trust, Precedence & Source Reliability Architecture</h2>
        <p className="page-subtitle">
          ParcelPilot's 5-tier authoritative precedence matrix resolving conflicting policies, contractual overrides, deprecations, and historical errors.
        </p>
      </div>

      {/* 5 Tier Cards */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        🏛️ Authoritative Precedence Hierarchy
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {tiers.map((t) => (
          <div
            key={t.tier}
            style={{
              padding: '1.2rem',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: `1px solid var(--badge-${t.badgeColor}-border)`,
              borderLeft: `5px solid var(--accent-${t.badgeColor})`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge badge-${t.badgeColor === 'rose' ? 'P1' : (t.badgeColor === 'amber' ? 'P2' : 'P3')}`}>
                  Tier {t.tier}
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {t.name}
                </span>
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: `var(--accent-${t.badgeColor})` }}>
                {t.authority}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t.description}
            </p>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <strong>Scope:</strong> {t.appliesTo}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Conflict Resolution Simulator */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        ⚖️ Live Conflict Resolution Simulator
      </h3>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {conflictCases.map((c, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCase(idx)}
            className={`nav-tab-btn ${activeCase === idx ? 'active' : ''}`}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem' }}
          >
            {c.title.split(':')[0]}
          </button>
        ))}
      </div>

      {conflictCases[activeCase] && (
        <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <h4 style={{ color: 'var(--accent-blue)', fontSize: '1rem', marginBottom: '6px' }}>
            {conflictCases[activeCase].title}
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <strong>Query:</strong> {conflictCases[activeCase].question}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.2rem' }}>
            {conflictCases[activeCase].sources.map((s, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    Tier {s.tier}: {s.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.text}</div>
                </div>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: s.decision === 'ACCEPTED_GOVERNING' ? 'var(--badge-emerald-bg)' : 'var(--badge-rose-bg)',
                    color: s.decision === 'ACCEPTED_GOVERNING' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    border: `1px solid ${s.decision === 'ACCEPTED_GOVERNING' ? 'var(--badge-emerald-border)' : 'var(--badge-rose-border)'}`
                  }}
                >
                  {s.decision.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid var(--badge-emerald-border)', color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
            <strong>Resolved Decision:</strong> {conflictCases[activeCase].outcome}
          </div>
        </div>
      )}
    </div>
  );
}
