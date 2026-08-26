import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, CheckCircle, Shield, ChevronDown, ChevronUp, Loader2, ArrowRight, PlusCircle, Layers, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActionCard } from './ActionCard';

export function ChatInterface() {
  const { currentUser, triggerRefresh } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openTraces, setOpenTraces] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const isCustomer = currentUser?.role === 'customer';
    const welcome = isCustomer
      ? `Hello **${currentUser.account_name} Operations**! I am the **ParcelPilot AI Support Agent**.\n\nI am scoped to your **${currentUser.account_name} (${currentUser.plan} Plan)** account. I can assist with order cancellations, service credits, SLA tracking, or general technical questions.\n\nHow can I help you today?`
      : `Hello **${currentUser?.name || 'Support Agent'}**! I am the **ParcelPilot AI Operations Assistant**.\n\nI have broad internal access across all customer accounts, carrier performance metrics, policy precedence resolvers, and emergency ticket escalations.\n\nSelect an operational scenario below or type a query:`;

    setMessages([
      {
        id: 'init-1',
        role: 'assistant',
        content: welcome,
        toolTrace: [],
        citations: [],
        trustBadge: isCustomer ? 'Tier 1 - Verified Agreement' : 'Internal Authority'
      }
    ]);
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getQuickPrompts = () => {
    if (currentUser?.role === 'customer') {
      if (currentUser?.account_id === 'ACCT-001') {
        return [
          'Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.',
          'What is our contracted first-response SLA for P1 incidents?',
          'Driver collected our parcel 10 mins ago, why does TKT-504 still show BOOKED?'
        ];
      }
      if (currentUser?.account_id === 'ACCT-002') {
        return [
          'Our pickup for ORD-2002 was delayed 6 hours. Are we eligible for a service credit?',
          'What are our contract terms for delayed pickups under LumenWorks agreement?'
        ];
      }
      return [
        'How much is the cancellation fee for booked shipments?',
        'What is our support response time for critical issues?'
      ];
    }
    return [
      'Can Northstar cancel ORD-1001 without paying a fee?',
      'LumenWorks pickup was delayed >4 hours on ORD-2002. Calculate credit and prepare action.',
      'Investigate open P1 ticket TKT-501 and check SLA breach status.',
      'What is the bulk CSV upload limit under KI-208?',
      'What is a REST API?'
    ];
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const savedToken = localStorage.getItem('parcelpilot_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {})
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: textToSend })
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
            proposedAction: data.proposedAction || null,
            trustBadge: data.trustBadge || 'Tier 2 - Authoritative Policy',
            warnings: data.warnings || []
          }
        ]);
        if (data.proposedAction) {
          triggerRefresh();
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `### ?? Error Processing Query\n\n${data.message || 'An unexpected error occurred.'}`,
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
          content: '### ?? Connection Error\n\nCould not communicate with the backend server.',
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

  const renderFormattedContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) return <h3 key={idx}>{line.substring(4)}</h3>;
      if (line.startsWith('#### ')) return <h4 key={idx}>{line.substring(5)}</h4>;
      if (line.startsWith('> ')) return <blockquote key={idx}>{line.substring(2)}</blockquote>;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx}>{parseInline(line.substring(2))}</li>;
      }
      if (line.trim() === '') return <div key={idx} style={{ height: '6px' }} />;
      return <p key={idx}>{parseInline(line)}</p>;
    });
  };

  const parseInline = (str) => {
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
    <div className="chat-layout-3col">
      <aside className="chat-sidebar-left">
        <div className="sidebar-header">
          <span className="sidebar-title">Quick Scenarios</span>
          <button className="btn-new-chat" onClick={() => handleSend('Hello')}>
            <PlusCircle size={14} />
            <span>Reset</span>
          </button>
        </div>
        <div className="topics-list">
          {getQuickPrompts().map((p, i) => (
            <button key={i} className="topic-card" onClick={() => handleSend(p)} disabled={loading}>
              <span className="topic-text">{p}</span>
              <ArrowRight size={13} className="topic-arrow" />
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-main-panel">
        <div className="chat-messages-scroll">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-row ${msg.role}`}>
              <div className={`chat-avatar ${msg.role}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className="chat-bubble-card">
                <div className="bubble-content">
                  {renderFormattedContent(msg.content)}
                </div>

                {msg.toolTrace && msg.toolTrace.length > 0 && (
                  <div className="tool-trace-accordion">
                    <div className="tool-trace-trigger" onClick={() => toggleTrace(msg.id)}>
                      <span className="trace-trigger-label">
                        <Sparkles size={14} color="#2563eb" />
                        <span>Execution Trace ({msg.toolTrace.length} tools)</span>
                      </span>
                      {openTraces[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>

                    {openTraces[msg.id] && (
                      <div className="tool-steps-container">
                        {msg.toolTrace.map((step, idx) => (
                          <div key={idx} className="tool-step-card">
                            <span className={`step-tag ${step.status.toLowerCase()}`}>
                              {step.tool}
                            </span>
                            <div className="step-content">
                              <div className="step-title">{step.title}</div>
                              <div className="step-desc">{step.details}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.proposedAction && (
                  <ActionCard
                    action={msg.proposedAction}
                    onActionComplete={() => triggerRefresh()}
                  />
                )}

                {(msg.citations?.length > 0 || msg.trustBadge) && (
                  <div className="chat-citations-footer">
                    {msg.trustBadge && (
                      <span className="trust-pill">
                        <Shield size={12} />
                        {msg.trustBadge}
                      </span>
                    )}
                    {msg.citations?.map((cit, idx) => (
                      <span key={idx} className="citation-tag">
                        <Check size={11} /> {cit.source}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-row assistant">
              <div className="chat-avatar assistant">
                <Bot size={16} />
              </div>
              <div className="chat-bubble-card loading-state">
                <Loader2 size={16} className="spinner" color="#2563eb" />
                <span>Evaluating agreements, support policies, and operational database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-composer-box">
          <form
            className="composer-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="composer-input"
              placeholder="Ask about orders, contracts, service credits, or SLAs..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-send-message" disabled={loading || !input.trim()}>
              <Send size={15} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </main>

      <aside className="chat-sidebar-right">
        <div className="context-card">
          <div className="context-title">
            <Shield size={15} color="#2563eb" />
            <span>Active Tenant Scope</span>
          </div>
          <div className="context-item">
            <span className="context-label">Account:</span>
            <span className="context-value">{currentUser?.account_name || 'All Internal Accounts'}</span>
          </div>
          <div className="context-item">
            <span className="context-label">Plan Tier:</span>
            <span className="context-value">{currentUser?.plan || 'Enterprise / Staff'}</span>
          </div>
          <div className="context-item">
            <span className="context-label">User Role:</span>
            <span className="context-value">{currentUser?.role || 'Internal'}</span>
          </div>
        </div>

        <div className="context-card">
          <div className="context-title">
            <Layers size={15} color="#059669" />
            <span>Source Precedence</span>
          </div>
          <div className="precedence-item active">
            <span className="tier-num">1</span>
            <span className="tier-name">Signed Agreement (Overrides)</span>
          </div>
          <div className="precedence-item">
            <span className="tier-num">2</span>
            <span className="tier-name">Support Policy v3 / SOP v4</span>
          </div>
          <div className="precedence-item">
            <span className="tier-num">3</span>
            <span className="tier-name">Operations Guide & KIs</span>
          </div>
          <div className="precedence-item guarded">
            <span className="tier-num">4</span>
            <span className="tier-name">Deprecated Policy v2 (Guarded)</span>
          </div>
          <div className="precedence-item untrusted">
            <span className="tier-num">5</span>
            <span className="tier-name">Historical Tickets (Context)</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
