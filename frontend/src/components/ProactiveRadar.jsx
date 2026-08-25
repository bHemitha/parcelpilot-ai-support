import React, { useState, useEffect } from 'react';
import { AlertOctagon, AlertTriangle, Clock, ShieldAlert, CheckCircle2, RefreshCw, ArrowUpRight, Zap, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProactiveRadar() {
  const { currentUser, refreshTrigger } = useAuth();
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proactive/radar', {
        headers: {
          Authorization: `Bearer ${currentUser?.token || ''}`,
          'x-user-id': currentUser?.user_id || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRadarData(data);
      }
    } catch (err) {
      console.error('Failed to load radar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, [currentUser?.user_id, refreshTrigger]);

  if (loading && !radarData) {
    return (
      <div className="full-view-pane" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div>Computing dynamic operational radar across tickets, orders, and SLAs...</div>
        </div>
      </div>
    );
  }

  const summary = radarData?.summary || {};
  const clusters = radarData?.clusters || [];
  const ticketInsights = radarData?.ticketInsights || [];
  const creditOrders = radarData?.creditEligibleOrders || [];

  return (
    <div className="full-view-pane">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">🚨 Proactive Operations Radar & Anomaly Detector</h2>
          <p className="page-subtitle">
            Automated detection of recurring incidents, critical SLA breaches, known bug spikes, and financial liability risks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Snapshot: {radarData?.referenceSnapshot}
          </span>
          <button
            onClick={fetchRadar}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Level Metric Summary Cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon-box blue">
            <Database size={20} />
          </div>
          <div>
            <div className="metric-val">{summary.totalOpenTickets || 0}</div>
            <div className="metric-label">Open Support Tickets</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box rose">
            <AlertOctagon size={20} />
          </div>
          <div>
            <div className="metric-val" style={{ color: 'var(--accent-rose)' }}>{summary.activeP1Incidents || 0}</div>
            <div className="metric-label">P1 Critical Outages</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box amber">
            <Clock size={20} />
          </div>
          <div>
            <div className="metric-val" style={{ color: 'var(--accent-amber)' }}>{summary.breachedSlaTickets || 0}</div>
            <div className="metric-label">Breached SLAs</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box emerald">
            <Zap size={20} />
          </div>
          <div>
            <div className="metric-val" style={{ color: 'var(--accent-emerald)' }}>
              ₹{summary.totalCreditLiabilityINR?.toLocaleString() || 0}
            </div>
            <div className="metric-label">Identified Credit Liabilities</div>
          </div>
        </div>
      </div>

      {/* Incident & Anomaly Clusters */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        🔥 Active Incident & Anomaly Clusters
      </h3>

      <div className="clusters-grid">
        {clusters.map((cl) => (
          <div key={cl.id} className={`cluster-card ${cl.severity}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge badge-${cl.severity === 'CRITICAL' ? 'P1' : (cl.severity === 'HIGH' ? 'P2' : 'P3')}`}>
                {cl.type.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                {cl.severity}
              </span>
            </div>

            <div className="cluster-title">{cl.title}</div>
            <div className="cluster-desc">{cl.description}</div>

            {cl.workaround && (
              <div style={{ fontSize: '0.78rem', background: 'rgba(56, 189, 248, 0.08)', padding: '6px 10px', borderRadius: '6px', color: 'var(--accent-blue)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <strong>Workaround:</strong> {cl.workaround}
              </div>
            )}

            {cl.actionRequired && (
              <div style={{ fontSize: '0.78rem', background: 'rgba(244, 63, 94, 0.08)', padding: '6px 10px', borderRadius: '6px', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <strong>Action:</strong> {cl.actionRequired}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Associated Records: {cl.tickets?.map(t => `${t.ticketId} (${t.account})`).join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* SLA Performance Radar Table */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.5rem 0 1rem 0', color: 'var(--text-primary)' }}>
        ⏱️ Live SLA Response Target Monitor
      </h3>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Account</th>
              <th>Priority</th>
              <th>Subject</th>
              <th>Target</th>
              <th>Elapsed</th>
              <th>SLA Performance</th>
              <th>Governing Rule</th>
            </tr>
          </thead>
          <tbody>
            {ticketInsights.map(t => (
              <tr key={t.ticketId}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  {t.ticketId}
                </td>
                <td>{t.accountName} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({t.plan})</span></td>
                <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                <td style={{ maxWidth: '280px' }}>{t.subject}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{t.targetMinutes}m</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{t.elapsedMinutes}m</td>
                <td>
                  {t.isBreached ? (
                    <span style={{ color: 'var(--accent-rose)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertOctagon size={14} /> BREACHED (+{t.overdueMinutes}m)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> {t.remainingMinutes}m remaining
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.governingRule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit Liability Tracker */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.5rem 0 1rem 0', color: 'var(--text-primary)' }}>
        💰 Identified Failed-Pickup Service Credit Liabilities
      </h3>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Account</th>
              <th>Carrier</th>
              <th>Pickup Window End</th>
              <th>Delay Duration</th>
              <th>Carrier Fault</th>
              <th>Credit Amount</th>
              <th>Governing Authority</th>
            </tr>
          </thead>
          <tbody>
            {creditOrders.map(c => (
              <tr key={c.orderId}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  {c.orderId}
                </td>
                <td>{c.accountName}</td>
                <td>{c.carrier}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{c.scheduledWindowEnd}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-rose)' }}>
                  {c.delayHours} hours
                </td>
                <td><span className="badge badge-P2">Confirmed</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                  ₹{c.creditAmountINR}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.governingAuthority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
