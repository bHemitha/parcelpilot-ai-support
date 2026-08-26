import React from 'react';
import { Package, MessageSquare, Radar, ShieldCheck, Database, Sun, Moon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, identities, switchPersona, theme, toggleTheme, realtimeConnected, backendHealthy } = useAuth();

  const tabs = [
    { id: 'chat', label: 'AI Agent', icon: MessageSquare },
    { id: 'radar', label: 'Operations Radar', icon: Radar },
    { id: 'trust', label: 'Trust & Precedence', icon: ShieldCheck },
    { id: 'data', label: 'Data Explorer', icon: Database }
  ];

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="brand-group">
          <div className="brand-icon">
            <Package size={20} color="#ffffff" />
          </div>
          <div>
            <div className="brand-name">ParcelPilot</div>
            <div className="brand-subtitle">AI Operations & Support Platform</div>
          </div>
        </div>

        <nav className="nav-tabs-bar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="navbar-right">
          {/* Visible Backend Health Status */}
          <div
            className={`live-status-pill ${backendHealthy ? 'online' : 'offline'}`}
            title={backendHealthy ? 'Backend API connected and responding normally' : 'Cannot reach backend server'}
            style={{
              background: backendHealthy ? 'var(--badge-emerald-bg)' : 'var(--badge-rose-bg)',
              color: backendHealthy ? 'var(--badge-emerald-text)' : 'var(--badge-rose-text)',
              borderColor: backendHealthy ? 'var(--badge-emerald-border)' : 'var(--badge-rose-border)'
            }}
          >
            <span
              className="pulse-indicator"
              style={{
                background: backendHealthy ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                boxShadow: backendHealthy ? '0 0 6px var(--accent-emerald)' : '0 0 6px var(--accent-rose)'
              }}
            />
            <span>{backendHealthy ? (realtimeConnected ? 'Live Sync' : 'Online') : 'Offline'}</span>
          </div>

          <div className="user-persona-box">
            <div className="avatar-circle">
              <User size={14} />
            </div>
            <select
              className="persona-dropdown"
              value={currentUser?.user_id || ''}
              onChange={(e) => switchPersona(e.target.value)}
            >
              {identities.map(id => (
                <option key={id.user_id} value={id.user_id}>
                  {id.role === 'customer' ? `${id.account_name} (${id.plan})` : `${id.name} (${id.role})`}
                </option>
              ))}
            </select>
          </div>

          <button className="btn-icon-theme" onClick={toggleTheme} title="Toggle Light/Dark Theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
