import React from 'react';
import { Package, MessageSquare, Radar, ShieldCheck, Database, Sun, Moon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, identities, switchPersona, theme, toggleTheme, realtimeConnected } = useAuth();

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
          <div className="live-status-pill" title="Real-time backend synchronization active">
            <span className="pulse-indicator" />
            <span>{realtimeConnected ? 'Live Sync' : 'Sync Active'}</span>
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
