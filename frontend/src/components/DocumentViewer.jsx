import React, { useState, useEffect } from 'react';
import { FileText, Shield, Search, CheckCircle2, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function DocumentViewer() {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/documents?q=${encodeURIComponent(search)}`, {
          headers: {
            Authorization: `Bearer ${currentUser?.token || ''}`,
            'x-user-id': currentUser?.user_id || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
          if (data.documents?.length > 0 && !selectedDoc) {
            setSelectedDoc(data.documents[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDocs();
  }, [currentUser?.user_id, search]);

  return (
    <div className="full-view-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem 2rem' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h2 className="page-title">📚 Knowledge Base & Policy Repository</h2>
        <p className="page-subtitle">
          Authoritative policies, customer agreements, standard operating procedures, and product operations guides.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        {/* Left Document List */}
        <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter policies & contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 30px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {documents.map((doc) => {
              const isSelected = selectedDoc?.document_id === doc.document_id;
              const isDeprecated = doc.status === 'DEPRECATED';

              return (
                <div
                  key={doc.document_id}
                  onClick={() => setSelectedDoc(doc)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                    border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    opacity: isDeprecated ? 0.7 : 1
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                      Tier {doc.authority_level}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isDeprecated ? 'var(--badge-rose-bg)' : 'var(--badge-emerald-bg)',
                        color: isDeprecated ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                        border: `1px solid ${isDeprecated ? 'var(--badge-rose-border)' : 'var(--badge-emerald-border)'}`
                      }}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {doc.title}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {doc.filename}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Document Viewer Content */}
        <div style={{ flex: 1, borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {selectedDoc ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-P3">Tier {selectedDoc.authority_level} Authority</span>
                    <span className={`badge badge-${selectedDoc.status === 'DEPRECATED' ? 'P1' : 'DELIVERED'}`}>
                      {selectedDoc.status}
                    </span>
                    {selectedDoc.account_id && (
                      <span className="badge badge-P2">Account: {selectedDoc.account_id}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedDoc.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    File: {selectedDoc.filename} | Effective: {selectedDoc.effective_date || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedDoc.status === 'DEPRECATED' && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--badge-rose-bg)', border: '1px solid var(--badge-rose-border)', color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} />
                  <strong>DEPRECATION GUARD ACTIVE:</strong> This document is retained for historical audit only and must never be applied to current requests.
                </div>
              )}

              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {selectedDoc.content}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select a document to inspect full text
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
