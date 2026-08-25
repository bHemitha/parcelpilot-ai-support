-- Schema definition for ParcelPilot SQLite Database

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  plan TEXT NOT NULL, -- Enterprise, Growth, Standard
  status TEXT NOT NULL DEFAULT 'active',
  csm TEXT,
  contract_file TEXT,
  premium_support INTEGER NOT NULL DEFAULT 0, -- 1 for true, 0 for false
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL, -- customer, support_agent, ops_lead, admin
  account_id TEXT, -- NULL for internal users
  token TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  carrier TEXT NOT NULL, -- SwiftShip, BlueDart, RoadRunner
  status TEXT NOT NULL, -- BOOKED, PICKED_UP, DELIVERED, CANCELLED
  booked_at DATETIME NOT NULL,
  pickup_window_start DATETIME NOT NULL,
  pickup_window_end DATETIME NOT NULL,
  pickup_actual_at DATETIME,
  shipment_fee_inr REAL NOT NULL,
  carrier_fault INTEGER NOT NULL DEFAULT 0,
  customer_fault INTEGER NOT NULL DEFAULT 0,
  cancellation_requested_at DATETIME,
  cancellation_fee_charged REAL DEFAULT 0,
  service_credit_issued REAL DEFAULT 0,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, pending, in_progress, escalated, resolved, closed
  priority TEXT NOT NULL DEFAULT 'P3', -- P1, P2, P3
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  channel TEXT NOT NULL, -- email, chat
  assigned_to TEXT,
  last_customer_message_at DATETIME,
  historical_resolution TEXT, -- for historical context tickets
  escalated_at DATETIME,
  escalation_reason TEXT,
  resolution_notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS documents (
  document_id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- agreement, policy, sop, guide
  account_id TEXT, -- NULL for general policies, specific account_id for customer agreements
  status TEXT NOT NULL, -- CURRENT, DEPRECATED, ACTIVE, RESOLVED
  authority_level INTEGER NOT NULL, -- 1: Customer Agreement, 2: Policy v3/SOP v4, 3: Ops Guide, 4: Deprecated Policy v2, 5: Historical Ticket
  effective_date TEXT,
  superseded_by TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT -- JSON array of tags
);

CREATE TABLE IF NOT EXISTS known_issues (
  issue_id TEXT PRIMARY KEY, -- KI-208, KI-211, KI-176
  title TEXT NOT NULL,
  status TEXT NOT NULL, -- Investigating, Monitoring, Resolved
  opened_at TEXT NOT NULL,
  resolved_at TEXT,
  affected_carriers TEXT, -- JSON array or comma list
  affected_features TEXT,
  symptoms TEXT NOT NULL,
  workaround TEXT,
  resolution_details TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  action_id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL, -- ESCALATE_TICKET, CHANGE_PRIORITY, ASSIGN_TICKET, ISSUE_SERVICE_CREDIT, CANCEL_ORDER, CREATE_FOLLOWUP
  target_entity TEXT NOT NULL, -- ticket, order, account
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION', -- PENDING_CONFIRMATION, APPROVED, REJECTED, EXECUTED, FAILED
  payload TEXT NOT NULL, -- JSON string of action parameters
  proposed_by_user_id TEXT NOT NULL,
  proposed_by_role TEXT NOT NULL,
  account_id TEXT,
  policy_justification TEXT,
  estimated_impact TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  executed_at DATETIME,
  rejected_at DATETIME,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS action_confirmations (
  confirmation_id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, REJECTED, EXPIRED
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (action_id) REFERENCES actions(action_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id TEXT PRIMARY KEY,
  action_id TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  account_id TEXT,
  action_type TEXT NOT NULL, -- STATE_CHANGE, ACCESS_DENIED, SECURITY_VIOLATION, QUERY_EXECUTED, PREPARATION, REJECTION
  target_entity TEXT,
  target_id TEXT,
  previous_state TEXT, -- JSON string or description
  new_state TEXT, -- JSON string or description
  authorization_result TEXT NOT NULL, -- ALLOWED, DENIED, ELEVATED_APPROVED
  policy_reference TEXT,
  notes TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
