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
    <div style={{
      marginTop: '12px',
      background: 'rgba(15, 23, 42, 0.75)',
      border: status === 'PENDING_CONFIRMATION' ? '1.5px solid #f59e0b' : (status === 'EXECUTED' ? '1.5px solid #10b981' : '1.5px solid #ef4444'),
      borderRadius: '10px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#f59e0b" />
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc', letterSpacing: '0.5px' }}>
            {action.actionType.replace(/_/g, ' ')}
          </span>
        </div>
        
        {status === 'PENDING_CONFIRMATION' ? (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.18)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '3px 8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={12} /> PENDING CONFIRMATION
          </span>
        ) : (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            background: status === 'EXECUTED' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
            color: status === 'EXECUTED' ? '#34d399' : '#f87171',
            border: `1px solid ${status === 'EXECUTED' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            padding: '3px 8px',
            borderRadius: '12px'
          }}>
            {status}
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '8px' }}>
        ACTION TOKEN: <span style={{ color: '#38bdf8' }}>{action.actionId}</span>
      </div>

      {/* Body */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.85rem', marginBottom: '4px' }}>
          Proposed State Change: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{action.targetEntity.toUpperCase()} {action.targetId}</span>
        </p>
        <p style={{ fontSize: '0.80rem', color: '#cbd5e1', lineHeight: '1.4' }}>
          {action.estimatedImpact || 'Action requires explicit human confirmation before executing against the production database.'}
        </p>
      </div>

      {/* Details Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '8px',
        background: 'rgba(30, 41, 59, 0.6)',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid rgba(51, 65, 85, 0.6)',
        marginBottom: '14px'
      }}>
        <div>
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            Policy Justification
          </div>
          <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 500 }}>
            {action.policyJustification || 'Support Policy v3 Section 4'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            Authorization Actor
          </div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
            {currentUser?.name || 'System User'} ({currentUser?.role || 'user'})
          </div>
        </div>
      </div>

      {/* Action Buttons (Pending Confirmation State) */}
      {status === 'PENDING_CONFIRMATION' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Approve & Execute Transaction
          </button>
          
          <button
            onClick={handleReject}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <XCircle size={16} />
            Reject
          </button>
        </div>
      )}

      {/* Executed State */}
      {status === 'EXECUTED' && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '6px',
          padding: '10px 12px',
          color: '#34d399',
          fontSize: '0.82rem'
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>{resultMessage}</div>
            {auditLogId && (
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                Immutable Audit Log ID: <span style={{ color: '#38bdf8' }}>{auditLogId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejected State */}
      {status === 'REJECTED' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          padding: '10px 12px',
          color: '#f87171',
          fontSize: '0.82rem'
        }}>
          <XCircle size={18} style={{ flexShrink: 0 }} />
          <div>{resultMessage}</div>
        </div>
      )}
    </div>
  );
}
