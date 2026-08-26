import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initial Auth & Health Check
  useEffect(() => {
    async function initAuth() {
      try {
        const savedToken = localStorage.getItem('parcelpilot_token');
        const headers = savedToken ? { Authorization: `Bearer ${savedToken}` } : {};

        const [healthRes, idRes, meRes] = await Promise.all([
          fetch('/api/health').catch(() => ({ ok: false })),
          fetch('/api/auth/identities', { headers }).catch(() => ({ ok: false })),
          fetch('/api/auth/me', { headers }).catch(() => ({ ok: false }))
        ]);

        if (healthRes.ok) {
          setBackendHealthy(true);
        } else {
          setBackendHealthy(false);
        }

        if (idRes.ok) {
          const idData = await idRes.json();
          setIdentities(idData.identities || []);
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }
      } catch (err) {
        console.error('Failed to initialize auth state:', err);
        setBackendHealthy(false);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Periodic health check every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/health');
        setBackendHealthy(res.ok);
      } catch (err) {
        setBackendHealthy(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Server-Sent Events for Live Sync
  useEffect(() => {
    let eventSource = null;
    let retryTimeout = null;

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/events');
        eventSource.onopen = () => setRealtimeConnected(true);
        eventSource.addEventListener('STATE_UPDATED', () => setRefreshTrigger(prev => prev + 1));
        eventSource.onerror = () => {
          setRealtimeConnected(false);
          eventSource.close();
          retryTimeout = setTimeout(connectSSE, 6000);
        };
      } catch (err) {
        setRealtimeConnected(false);
      }
    }

    connectSSE();
    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  const switchPersona = async (userId) => {
    try {
      const target = identities.find(i => i.user_id === userId);
      const res = await fetch('/api/auth/switch-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: target ? target.token : null })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.user.token) {
          localStorage.setItem('parcelpilot_token', data.user.token);
        }
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        identities,
        loading,
        theme,
        toggleTheme,
        switchPersona,
        refreshTrigger,
        realtimeConnected,
        backendHealthy,
        triggerRefresh: () => setRefreshTrigger(prev => prev + 1)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
