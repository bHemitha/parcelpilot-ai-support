import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ActionCard({ action, onActionComplete }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(action.status || 'PENDING_CONFIRMATION');
  const [resultMessage, setResultMessage] = useState('');
  const [auditLogId, setAuditLogId] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/actions/${action.actionId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token || ''}`,
          'x-user-id': currentUser?.user_id || ''
        }
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('EXECUTED');
        setResultMessage(data.message || 'Action executed successfully in database.');
        setAuditLogId(data.auditLogId || '');
        if (onActionComplete) onActionComplete(data);
      } else {
        alert(data.message || 'Failed to confirm action');
      }
    } catch (err) {
      alert('Network error confirming action');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/actions/${action.actionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token || ''}`,
          'x-user-id': currentUser?.user_id || ''
        },
        body: JSON.stringify({ reason: 'Declined by user via interactive card' })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('REJECTED');
        setResultMessage('Action was rejected. No database changes were made.');
        if (onActionComplete) onActionComplete(data);
      }
    } catch (err) {
      alert('Network error rejecting action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="action-card">
      <div className="action-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--accent-amber)" />
          <span className="action-type-badge">{action.actionType.replace(/_/g, ' ')}</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          ID: {action.actionId}
        </span>
      </div>

      <div className="action-content">
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Proposed State Change: <span style={{ color: 'var(--accent-blue)' }}>{action.targetEntity.toUpperCase()} {action.targetId}</span>
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {action.estimatedImpact || 'Action requires explicit human confirmation before executing against the production database.'}
        </p>
      </div>

      <div className="action-detail-grid">
        <div className="action-detail-item">
          <div className="action-detail-label">Policy Justification</div>
          <div className="action-detail-val" style={{ fontSize: '0.78rem' }}>
            {action.policyJustification || 'Standard Operating Procedure'}
          </div>
        </div>
        <div className="action-detail-item">
          <div className="action-detail-label">Authorization Actor</div>
          <div className="action-detail-val">
            {currentUser?.name} ({currentUser?.role})
          </div>
        </div>
      </div>

      {status === 'PENDING_CONFIRMATION' && (
        <div className="action-buttons">
          <button className="btn-confirm" onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Approve & Execute Transaction
          </button>
          <button className="btn-reject" onClick={handleReject} disabled={loading}>
            <XCircle size={16} />
            Reject
          </button>
        </div>
      )}

      {status === 'EXECUTED' && (
        <div className="action-status-banner EXECUTED">
          <CheckCircle2 size={18} />
          <div>
            <div>{resultMessage}</div>
            {auditLogId && (
              <div style={{ fontSize: '0.75rem', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
                Immutable Audit Log ID: {auditLogId}
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'REJECTED' && (
        <div className="action-status-banner REJECTED">
          <XCircle size={18} />
          <div>{resultMessage}</div>
        </div>
      )}
    </div>
  );
}
