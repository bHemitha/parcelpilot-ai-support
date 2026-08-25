import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL || path.resolve(__dirname, '../parcelpilot.db'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  // Assignment reference snapshot time: 2026-08-16 11:00 AM IST
  REFERENCE_TIMESTAMP: process.env.REFERENCE_TIMESTAMP || '2026-08-16T11:00:00+05:30',
  CURRENCY: 'INR',
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  // Hardcoded known demo users for easy, explicit persona selection
  DEMO_USERS: [
    {
      id: 'usr_northstar',
      name: 'Northstar Logistics Operations',
      email: 'ops@northstarlogistics.com',
      role: 'customer',
      accountId: 'ACCT-001',
      accountName: 'Northstar Logistics',
      plan: 'Enterprise',
      token: 'demo-token-northstar-acct001'
    },
    {
      id: 'usr_lumenworks',
      name: 'LumenWorks Logistics Lead',
      email: 'supply@lumenworks.io',
      role: 'customer',
      accountId: 'ACCT-002',
      accountName: 'LumenWorks',
      plan: 'Growth',
      token: 'demo-token-lumenworks-acct002'
    },
    {
      id: 'usr_beacon',
      name: 'Beacon Retail Admin',
      email: 'logistics@beaconretail.com',
      role: 'customer',
      accountId: 'ACCT-003',
      accountName: 'Beacon Retail',
      plan: 'Standard',
      token: 'demo-token-beacon-acct003'
    },
    {
      id: 'usr_axis',
      name: 'Axis Labs Dispatcher',
      email: 'dispatch@axislabs.tech',
      role: 'customer',
      accountId: 'ACCT-004',
      accountName: 'Axis Labs',
      plan: 'Enterprise',
      token: 'demo-token-axis-acct004'
    },
    {
      id: 'usr_agent_rohit',
      name: 'Rohit Sharma',
      email: 'rohit.s@parcelpilot.internal',
      role: 'support_agent',
      accountId: null,
      accountName: 'ParcelPilot Operations',
      plan: 'Internal',
      token: 'demo-token-agent-rohit'
    },
    {
      id: 'usr_agent_maya',
      name: 'Maya Patel',
      email: 'maya.p@parcelpilot.internal',
      role: 'support_agent',
      accountId: null,
      accountName: 'ParcelPilot Operations',
      plan: 'Internal',
      token: 'demo-token-agent-maya'
    },
    {
      id: 'usr_ops_lead',
      name: 'Vikram Seth (Ops Lead / Manager)',
      email: 'vikram.seth@parcelpilot.internal',
      role: 'ops_lead',
      accountId: null,
      accountName: 'ParcelPilot Operations',
      plan: 'Internal',
      token: 'demo-token-ops-lead'
    },
    {
      id: 'usr_admin',
      name: 'System Administrator',
      email: 'admin@parcelpilot.internal',
      role: 'admin',
      accountId: null,
      accountName: 'ParcelPilot Infrastructure',
      plan: 'Internal',
      token: 'demo-token-admin'
    }
  ]
};
