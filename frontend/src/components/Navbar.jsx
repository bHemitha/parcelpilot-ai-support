import React from 'react';
import { Package, MessageSquare, Radar, ShieldCheck, Database, FileText, Sun, Moon, Sparkles, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, identities, switchPersona, theme, toggleTheme, realtimeConnected } = useAuth();

  const tabs = [
    { id: 'chat', label: 'AI Agent Chat', icon: MessageSquare },
    { id: 'radar', label: 'Proactive Radar', icon: Radar },
    { id: 'trust', label: 'Trust & Precedence', icon: ShieldCheck },
    { id: 'data', label: 'Data Explorer', icon: Database },
    { id: 'documents', label: 'Policy Docs', icon: FileText }
  ];

  return (
    <nav className="navbar">
      <div className="brand-section">
        <div className="brand-logo">
          <Package size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="brand-name">ParcelPilot</span>
            <span className="ai-pill">AI Ops & Support</span>
          </div>
        </div>
      </div>

      <div className="nav-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="nav-actions">
        <div className="live-pulse" title="Server-Sent Events active">
          <div className="pulse-dot" style={{ background: realtimeConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)' }} />
          <span>{realtimeConnected ? 'LIVE SYNC' : 'POLLING'}</span>
        </div>

        <select
          className="persona-select"
          value={currentUser?.user_id || ''}
          onChange={(e) => switchPersona(e.target.value)}
        >
          {identities.map(id => (
            <option key={id.user_id} value={id.user_id}>
              {id.role === 'customer' ? `🏢 ${id.account_name} (${id.plan})` : `🛡️ ${id.name} (${id.role})`}
            </option>
          ))}
        </select>

        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.45rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </nav>
  );
}
