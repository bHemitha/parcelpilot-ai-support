import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ChatInterface } from './components/ChatInterface';
import { ProactiveRadar } from './components/ProactiveRadar';
import { TrustMatrix } from './components/TrustMatrix';
import { DataExplorer } from './components/DataExplorer';
import { DocumentViewer } from './components/DocumentViewer';

function AppContent() {
  const [activeTab, setActiveTab] = useState('chat');
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div>Loading ParcelPilot AI Support & Operations Platform...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'radar' && <ProactiveRadar />}
        {activeTab === 'trust' && <TrustMatrix />}
        {activeTab === 'data' && <DataExplorer />}
        {activeTab === 'documents' && <DocumentViewer />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
