import React, { useState, useEffect } from 'react';
import { Database, FileText, Package, Ticket, Shield, RefreshCw, Search, CheckCircle2, AlertOctagon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function DataExplorer() {
  const { currentUser, refreshTrigger } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${currentUser?.token || ''}`,
        'x-user-id': currentUser?.user_id || ''
      };

      const [acctRes, ordRes, tktRes, audRes] = await Promise.all([
        fetch('/api/accounts', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/tickets', { headers }),
        fetch('/api/audit-logs', { headers })
      ]);

      if (acctRes.ok) setAccounts((await acctRes.json()).accounts || []);
      if (ordRes.ok) setOrders((await ordRes.json()).orders || []);
      if (tktRes.ok) setTickets((await tktRes.json()).tickets || []);
      if (audRes.ok) setAuditLogs((await audRes.json()).auditLogs || []);
    } catch (err) {
      console.error('Failed to load data explorer state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.user_id, refreshTrigger]);

  const filteredOrders = orders.filter(o =>
    o.order_id.toLowerCase().includes(search.toLowerCase()) ||
    o.carrier.toLowerCase().includes(search.toLowerCase()) ||
    (o.account_name || '').toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTickets = tickets.filter(t =>
    t.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    (t.account_name || '').toLowerCase().includes(search.toLowerCase()) ||
    t.priority.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(a =>
    a.log_id.toLowerCase().includes(search.toLowerCase()) ||
    a.action_type.toLowerCase().includes(search.toLowerCase()) ||
    a.user_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.target_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="full-view-pane">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">📊 Operational Data Explorer & Audit Ledger</h2>
          <p className="page-subtitle">
            Live querying of SQLite database tables with tenant isolation scoping and real-time state mutation sync.
          </p>
        </div>

        <button
          onClick={loadData}
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
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Sub tabs and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`nav-tab-btn ${activeSubTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('orders')}
          >
            <Package size={14} /> Orders ({orders.length})
          </button>
          <button
            className={`nav-tab-btn ${activeSubTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('tickets')}
          >
            <Ticket size={14} /> Tickets ({tickets.length})
          </button>
          <button
            className={`nav-tab-btn ${activeSubTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('accounts')}
          >
            <Database size={14} /> Accounts ({accounts.length})
          </button>
          <button
            className={`nav-tab-btn ${activeSubTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('audit')}
          >
            <Shield size={14} /> Audit Logs ({auditLogs.length})
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '6px 12px 6px 30px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Orders Table */}
      {activeSubTab === 'orders' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Account</th>
                <th>Carrier</th>
                <th>Status</th>
                <th>Booked At</th>
                <th>Pickup Window</th>
                <th>Actual Pickup</th>
                <th>Fee (INR)</th>
                <th>Cancellation Fee</th>
                <th>Credit Issued</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.order_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {o.order_id}
                  </td>
                  <td>{o.account_name || o.account_id}</td>
                  <td>{o.carrier}</td>
                  <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{o.booked_at}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{o.pickup_window_start?.substring(11)} - {o.pickup_window_end?.substring(11)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{o.pickup_actual_at || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>₹{o.shipment_fee_inr}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: o.cancellation_fee_charged > 0 ? 'var(--accent-rose)' : 'inherit' }}>
                    {o.cancellation_fee_charged ? `₹${o.cancellation_fee_charged}` : '₹0'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: o.service_credit_issued > 0 ? 'var(--accent-emerald)' : 'inherit' }}>
                    {o.service_credit_issued ? `₹${o.service_credit_issued}` : '₹0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tickets Table */}
      {activeSubTab === 'tickets' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Account</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Subject</th>
                <th>Assigned To</th>
                <th>Created At</th>
                <th>Escalated</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.ticket_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {t.ticket_id}
                  </td>
                  <td>{t.account_name || t.account_id}</td>
                  <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600 }}>{t.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.description}</div>
                    {t.historical_resolution && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', marginTop: '2px', background: 'rgba(245, 158, 11, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                        Past Resolution: {t.historical_resolution}
                      </div>
                    )}
                  </td>
                  <td>{t.assigned_to || 'Unassigned'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{t.created_at}</td>
                  <td>
                    {t.status === 'escalated' ? (
                      <span className="badge badge-P1">ESCALATED</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Accounts Table */}
      {activeSubTab === 'accounts' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Account Name</th>
                <th>Plan Tier</th>
                <th>Status</th>
                <th>Dedicated CSM</th>
                <th>Signed Agreement File</th>
                <th>Premium Support</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.account_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {a.account_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{a.account_name}</td>
                  <td><span className="badge badge-P3">{a.plan}</span></td>
                  <td><span className="badge badge-DELIVERED">{a.status}</span></td>
                  <td>{a.csm || 'None'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{a.contract_file || 'None (Standard Policy Applies)'}</td>
                  <td>{a.premium_support ? '✅ Enabled' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Logs Table */}
      {activeSubTab === 'audit' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action Type</th>
                <th>Target</th>
                <th>Previous State</th>
                <th>New State</th>
                <th>Authorization</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.map(aud => (
                <tr key={aud.log_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {aud.log_id}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{aud.timestamp}</td>
                  <td style={{ fontWeight: 600 }}>{aud.user_name}</td>
                  <td><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{aud.role}</span></td>
                  <td>
                    <span className={`badge ${aud.action_type === 'SECURITY_VIOLATION' ? 'badge-P1' : (aud.action_type === 'STATE_CHANGE' ? 'badge-DELIVERED' : 'badge-P3')}`}>
                      {aud.action_type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{aud.target_entity} {aud.target_id}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{aud.previous_state || '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 500 }}>{aud.new_state || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: aud.authorization_result === 'ALLOWED' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {aud.authorization_result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
