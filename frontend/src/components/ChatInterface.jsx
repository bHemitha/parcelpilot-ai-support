import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, ChevronUp, Shield, AlertCircle, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActionCard } from './ActionCard';

export function ChatInterface() {
  const { currentUser, triggerRefresh } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openTraces, setOpenTraces] = useState({});
  const messagesEndRef = useRef(null);

  // Suggested quick prompts depending on active role/account
  const getQuickPrompts = () => {
    if (!currentUser) return [];
    if (currentUser.account_id === 'ACCT-001') {
      return [
        'Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.',
        'What is our contracted first-response SLA for P1 incidents?',
        'Driver collected our parcel 10 mins ago, why does TKT-504 still show BOOKED?'
      ];
    } else if (currentUser.account_id === 'ACCT-002') {
      return [
        'A pickup is three hours late because of carrier fault for LumenWorks ORD-2002. Should I get a service credit?',
        'Why did our bulk upload fail for 4,200 rows in TKT-502?',
        'Can we cancel ORD-2001 requested 75 minutes after booking?'
      ];
    } else if (currentUser.role === 'customer') {
      return [
        'Can we cancel our recent shipment without a fee?',
        'What are our support response targets under our current plan?',
        'How do we update the billing contact on our account?'
      ];
    } else {
      // Internal Support Agent / Ops Lead
      return [
        'Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.',
        'A pickup is three hours late because of carrier fault for LumenWorks ORD-2002. Should I get a service credit?',
        'Investigate TKT-501 (Northstar HTTP 500 outage) and check SLA breach status.',
        'Why are Growth plan bulk CSV uploads failing for 4,200 rows?'
      ];
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Add initial welcome message on mount or persona switch
  useEffect(() => {
    if (!currentUser) return;
    const isCustomer = currentUser.role === 'customer';
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello **${currentUser.name}**! I am the **ParcelPilot AI Customer Support & Operations Agent**.

${isCustomer ? `I am scoped to your **${currentUser.account_name} (${currentUser.plan} Plan)** account. I can assist you with contract entitlements, order cancellations, service credits, and support requests.` : `You are logged in with **${currentUser.role.toUpperCase()}** permissions. I have full cross-account visibility over orders, agreements, SLA timers, known issue investigations, and state action execution.`}

How can I help you today?`,
        toolTrace: [],
        citations: [],
        trustBadge: isCustomer && currentUser.account_id === 'ACCT-001' ? 'Tier 1 - Verified Agreement' : 'Tier 2 - Authoritative Policy',
        proposedAction: null
      }
    ]);
  }, [currentUser?.user_id]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMessageId = `usr-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMessageId, role: 'user', content: queryText }
    ];

    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token || ''}`,
          'x-user-id': currentUser?.user_id || ''
        },
        body: JSON.stringify({
          query: queryText,
          history: newMessages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: data.answer,
            toolTrace: data.toolTrace || [],
            citations: data.citations || [],
            trustBadge: data.trustBadge || 'Tier 2 - Authoritative Policy',
            warnings: data.warnings || [],
            proposedAction: data.proposedAction || null
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ **Error Processing Query:** ${data.message || 'An unexpected error occurred.'}`,
            toolTrace: [],
            citations: [],
            trustBadge: 'System Alert'
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Connection Error:** Could not communicate with the backend server. Please verify backend is running on port 3001.`,
          toolTrace: [],
          citations: [],
          trustBadge: 'Offline'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrace = (msgId) => {
    setOpenTraces(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Helper to format basic markdown elements
  const renderFormattedContent = (text) => {
    // Basic Markdown parser for headings, bold, bullet points, quotes
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx}>{line.substring(4)}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx}>{line.substring(5)}</h4>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={idx}>{line.substring(2)}</blockquote>;
      }
      if (line.startsWith('- ') || line.startsWith('● ') || line.startsWith('* ')) {
        return <li key={idx} style={{ marginLeft: '1.2rem', marginY: '2px' }}>{parseInline(line.substring(2))}</li>;
      }
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return <p key={idx} style={{ marginBottom: '4px' }}>{parseInline(line)}</p>;
    });
  };

  const parseInline = (str) => {
    // Process **bold** and `code`
    const parts = [];
    let remaining = str;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/\`(.*?)\`/);

      let firstMatch = null;
      let matchType = null;

      if (boldMatch && (!codeMatch || boldMatch.index < codeMatch.index)) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (codeMatch) {
        firstMatch = codeMatch;
        matchType = 'code';
      }

      if (firstMatch) {
        const textBefore = remaining.substring(0, firstMatch.index);
        if (textBefore) parts.push(<span key={key++}>{textBefore}</span>);

        if (matchType === 'bold') {
          parts.push(<strong key={key++}>{firstMatch[1]}</strong>);
        } else {
          parts.push(<code key={key++}>{firstMatch[1]}</code>);
        }

        remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }

    return parts;
  };

  return (
    <div className="chat-pane">
      <div className="chat-history">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-card ${msg.role}`}>
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>

            <div className="bubble">
              {renderFormattedContent(msg.content)}

              {/* Warnings Pill */}
              {msg.warnings && msg.warnings.length > 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--accent-amber)' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Trust & Precedence Notice:
                  </div>
                  {msg.warnings.map((w, i) => (
                    <div key={i} style={{ marginTop: '2px' }}>{w}</div>
                  ))}
                </div>
              )}

              {/* Tool Execution Trace Accordion */}
              {msg.toolTrace && msg.toolTrace.length > 0 && (
                <div className="tool-trace-box">
                  <div className="tool-trace-header" onClick={() => toggleTrace(msg.id)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={13} color="var(--accent-blue)" />
                      Agent Execution Trace ({msg.toolTrace.length} tools executed)
                    </span>
                    {openTraces[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>

                  {openTraces[msg.id] && (
                    <div className="tool-steps-list">
                      {msg.toolTrace.map((step, idx) => (
                        <div key={idx} className="tool-step-item">
                          <span className={`tool-step-badge ${step.status}`}>
                            {step.tool}
                          </span>
                          <div className="tool-step-info">
                            <div className="tool-step-title">{step.title}</div>
                            <div className="tool-step-details">{step.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Human-In-The-Loop Action Card */}
              {msg.proposedAction && (
                <ActionCard
                  action={msg.proposedAction}
                  onActionComplete={() => triggerRefresh()}
                />
              )}

              {/* Citations & Trust Badges */}
              {(msg.citations?.length > 0 || msg.trustBadge) && (
                <div className="citations-box">
                  {msg.trustBadge && (
                    <span className="trust-badge-pill">
                      <Shield size={12} />
                      {msg.trustBadge}
                    </span>
                  )}
                  {msg.citations?.map((cit, idx) => (
                    <span key={idx} className="citation-pill" title={`Tier ${cit.tier} - Confidence: ${(cit.confidence * 100).toFixed(0)}%`}>
                      📄 {cit.source}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-card assistant">
            <div className="avatar assistant">
              <Bot size={18} />
            </div>
            <div className="bubble" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={18} className="animate-spin" color="var(--accent-blue)" />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Reasoning across policies, agreements, and operational records...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar with Quick Prompts */}
      <div className="chat-input-bar">
        <div className="quick-prompts">
          {getQuickPrompts().map((p, idx) => (
            <button
              key={idx}
              className="prompt-chip"
              onClick={() => handleSend(p)}
              disabled={loading}
            >
              💡 {p}
            </button>
          ))}
        </div>

        <form
          className="input-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder={`Ask about orders, agreements, cancellations, service credits, or SLAs...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-send" disabled={loading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
