import { getDatabase } from './database.js';
import { CONFIG } from '../config.js';

export function seedDatabase(force = false) {
  const db = getDatabase();

  const accountCount = db.prepare('SELECT count(*) as count FROM accounts').get().count;
  if (accountCount > 0 && !force) {
    return { status: 'already_seeded', accounts: accountCount };
  }

  const seedTransaction = db.transaction(() => {
    // Clear existing data if force is true
    if (force) {
      db.prepare('DELETE FROM action_confirmations').run();
      db.prepare('DELETE FROM actions').run();
      db.prepare('DELETE FROM audit_logs').run();
      db.prepare('DELETE FROM tickets').run();
      db.prepare('DELETE FROM orders').run();
      db.prepare('DELETE FROM documents').run();
      db.prepare('DELETE FROM known_issues').run();
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM accounts').run();
    }

    // 1. Seed Accounts
    const insertAccount = db.prepare(`
      INSERT INTO accounts (account_id, account_name, plan, status, csm, contract_file, premium_support, notes)
      VALUES (@account_id, @account_name, @plan, @status, @csm, @contract_file, @premium_support, @notes)
    `);

    const accountsData = [
      {
        account_id: 'ACCT-001',
        account_name: 'Northstar Logistics',
        plan: 'Enterprise',
        status: 'active',
        csm: 'Priya Mehta',
        contract_file: '05_Northstar_Logistics_Enterprise_Agreement.pdf',
        premium_support: 1,
        notes: 'Strategic account. Contract contains custom SLA and cancellation terms.'
      },
      {
        account_id: 'ACCT-002',
        account_name: 'LumenWorks',
        plan: 'Growth',
        status: 'active',
        csm: 'Arjun Rao',
        contract_file: '06_LumenWorks_Service_Agreement.pdf',
        premium_support: 0,
        notes: 'Growth customer with contract-specific service credit terms.'
      },
      {
        account_id: 'ACCT-003',
        account_name: 'Beacon Retail',
        plan: 'Standard',
        status: 'active',
        csm: 'Neha Kapoor',
        contract_file: null,
        premium_support: 0,
        notes: 'No custom agreement in the supplied pack; standard policies apply.'
      },
      {
        account_id: 'ACCT-004',
        account_name: 'Axis Labs',
        plan: 'Enterprise',
        status: 'active',
        csm: 'Priya Mehta',
        contract_file: null,
        premium_support: 0,
        notes: 'Enterprise plan; standard Enterprise support policy applies.'
      }
    ];

    accountsData.forEach(acct => insertAccount.run(acct));

    // 2. Seed Users
    const insertUser = db.prepare(`
      INSERT INTO users (user_id, name, email, role, account_id, token)
      VALUES (@user_id, @name, @email, @role, @account_id, @token)
    `);

    CONFIG.DEMO_USERS.forEach(u => {
      insertUser.run({
        user_id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        account_id: u.accountId,
        token: u.token
      });
    });

    // 3. Seed Orders
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_id, account_id, carrier, status, booked_at,
        pickup_window_start, pickup_window_end, pickup_actual_at,
        shipment_fee_inr, carrier_fault, customer_fault,
        cancellation_requested_at, notes
      ) VALUES (
        @order_id, @account_id, @carrier, @status, @booked_at,
        @pickup_window_start, @pickup_window_end, @pickup_actual_at,
        @shipment_fee_inr, @carrier_fault, @customer_fault,
        @cancellation_requested_at, @notes
      )
    `);

    const ordersData = [
      {
        order_id: 'ORD-1001',
        account_id: 'ACCT-001',
        carrier: 'SwiftShip',
        status: 'BOOKED',
        booked_at: '2026-08-16 09:00',
        pickup_window_start: '2026-08-16 10:30',
        pickup_window_end: '2026-08-16 11:30',
        pickup_actual_at: null,
        shipment_fee_inr: 4200,
        carrier_fault: 0,
        customer_fault: 0,
        cancellation_requested_at: '2026-08-16 11:00',
        notes: 'Customer asks to cancel. Shipment has not been picked up.'
      },
      {
        order_id: 'ORD-1002',
        account_id: 'ACCT-001',
        carrier: 'BlueDart',
        status: 'PICKED_UP',
        booked_at: '2026-08-16 08:10',
        pickup_window_start: '2026-08-16 09:00',
        pickup_window_end: '2026-08-16 10:00',
        pickup_actual_at: '2026-08-16 09:35',
        shipment_fee_inr: 5100,
        carrier_fault: 0,
        customer_fault: 0,
        cancellation_requested_at: '2026-08-16 10:20',
        notes: 'Customer later asked to cancel after pickup.'
      },
      {
        order_id: 'ORD-2001',
        account_id: 'ACCT-002',
        carrier: 'SwiftShip',
        status: 'BOOKED',
        booked_at: '2026-08-16 09:00',
        pickup_window_start: '2026-08-16 11:00',
        pickup_window_end: '2026-08-16 12:00',
        pickup_actual_at: null,
        shipment_fee_inr: 1800,
        carrier_fault: 0,
        customer_fault: 0,
        cancellation_requested_at: '2026-08-16 10:15',
        notes: 'Cancellation requested 75 minutes after booking; not yet picked up.'
      },
      {
        order_id: 'ORD-2002',
        account_id: 'ACCT-002',
        carrier: 'RoadRunner',
        status: 'BOOKED',
        booked_at: '2026-08-16 04:30',
        pickup_window_start: '2026-08-16 05:30',
        pickup_window_end: '2026-08-16 06:30',
        pickup_actual_at: null,
        shipment_fee_inr: 2400,
        carrier_fault: 1,
        customer_fault: 0,
        cancellation_requested_at: null,
        notes: 'Pickup missed. Carrier accepted fault. Still not picked up at dataset snapshot.'
      },
      {
        order_id: 'ORD-3001',
        account_id: 'ACCT-003',
        carrier: 'RoadRunner',
        status: 'BOOKED',
        booked_at: '2026-08-16 10:25',
        pickup_window_start: '2026-08-16 12:00',
        pickup_window_end: '2026-08-16 13:00',
        pickup_actual_at: null,
        shipment_fee_inr: 1200,
        carrier_fault: 0,
        customer_fault: 0,
        cancellation_requested_at: '2026-08-16 10:40',
        notes: 'Cancellation requested within 30 minutes of booking.'
      },
      {
        order_id: 'ORD-4001',
        account_id: 'ACCT-004',
        carrier: 'SwiftShip',
        status: 'DELIVERED',
        booked_at: '2026-08-14 14:00',
        pickup_window_start: '2026-08-15 09:00',
        pickup_window_end: '2026-08-15 10:00',
        pickup_actual_at: '2026-08-15 09:20',
        shipment_fee_inr: 3600,
        carrier_fault: 0,
        customer_fault: 0,
        cancellation_requested_at: null,
        notes: 'Completed delivery.'
      }
    ];

    ordersData.forEach(ord => insertOrder.run(ord));

    // 4. Seed Tickets
    const insertTicket = db.prepare(`
      INSERT INTO tickets (
        ticket_id, account_id, created_at, status, priority,
        subject, description, channel, assigned_to,
        last_customer_message_at, historical_resolution
      ) VALUES (
        @ticket_id, @account_id, @created_at, @status, @priority,
        @subject, @description, @channel, @assigned_to,
        @last_customer_message_at, @historical_resolution
      )
    `);

    const ticketsData = [
      {
        ticket_id: 'TKT-501',
        account_id: 'ACCT-001',
        created_at: '2026-08-16 10:30',
        status: 'open',
        priority: 'P1',
        subject: 'All shipment creation is failing',
        description: 'Every user at Northstar gets HTTP 500 when creating any shipment. Existing shipments can still be viewed.',
        channel: 'email',
        assigned_to: 'Rohit Sharma',
        last_customer_message_at: '2026-08-16 10:52',
        historical_resolution: null
      },
      {
        ticket_id: 'TKT-502',
        account_id: 'ACCT-002',
        created_at: '2026-08-16 09:45',
        status: 'open',
        priority: 'P2',
        subject: 'Bulk upload fails for 4,200-row CSV',
        description: 'The CSV reaches roughly 70% and fails. Creating shipments one-by-one still works.',
        channel: 'chat',
        assigned_to: 'Maya Patel',
        last_customer_message_at: '2026-08-16 10:40',
        historical_resolution: null
      },
      {
        ticket_id: 'TKT-503',
        account_id: 'ACCT-003',
        created_at: '2026-08-16 10:05',
        status: 'open',
        priority: 'P3',
        subject: 'How do we change the billing contact?',
        description: 'Customer wants to replace the billing-contact email on their account.',
        channel: 'email',
        assigned_to: 'Rohit Sharma',
        last_customer_message_at: '2026-08-16 10:05',
        historical_resolution: null
      },
      {
        ticket_id: 'TKT-504',
        account_id: 'ACCT-001',
        created_at: '2026-08-16 10:50',
        status: 'open',
        priority: 'P2',
        subject: 'SwiftShip order still shows BOOKED after driver pickup',
        description: 'Driver collected the parcel around 10 minutes ago, but ParcelPilot still shows BOOKED.',
        channel: 'chat',
        assigned_to: 'Maya Patel',
        last_customer_message_at: '2026-08-16 10:58',
        historical_resolution: null
      },
      {
        ticket_id: 'TKT-505',
        account_id: 'ACCT-004',
        created_at: '2026-08-16 08:30',
        status: 'open',
        priority: 'P1',
        subject: 'Possible API key exposure',
        description: 'An employee accidentally posted a screenshot containing a production API key in a public channel. They are asking what to do.',
        channel: 'email',
        assigned_to: 'Rohit Sharma',
        last_customer_message_at: '2026-08-16 09:10',
        historical_resolution: null
      },
      {
        ticket_id: 'TKT-450',
        account_id: 'ACCT-001',
        created_at: '2026-07-12 14:10',
        status: 'closed',
        priority: 'P3',
        subject: 'Cancellation fee after 30 minutes',
        description: 'Northstar asked whether a BOOKED shipment could be cancelled 90 minutes after booking before pickup.',
        channel: 'email',
        assigned_to: 'Maya Patel',
        last_customer_message_at: '2026-07-12 15:00',
        historical_resolution: 'Agent told customer a INR 250 cancellation fee applied after 30 minutes. [INCORRECT: Contract waives cancellation fees for Northstar]'
      },
      {
        ticket_id: 'TKT-451',
        account_id: 'ACCT-002',
        created_at: '2026-08-11 11:20',
        status: 'closed',
        priority: 'P2',
        subject: 'Bulk upload fails for large CSV',
        description: 'LumenWorks reported failures when uploading 3,500-row CSV files.',
        channel: 'chat',
        assigned_to: 'Rohit Sharma',
        last_customer_message_at: '2026-08-11 12:10',
        historical_resolution: 'Agent told customer Growth plan only supports 3,000 rows. [INCORRECT: Growth supports 5,000 rows, failure is due to Known Issue KI-208]'
      }
    ];

    ticketsData.forEach(tkt => insertTicket.run(tkt));

    // 5. Seed Documents
    const insertDocument = db.prepare(`
      INSERT INTO documents (
        document_id, filename, title, type, account_id,
        status, authority_level, effective_date, superseded_by,
        content, summary, tags
      ) VALUES (
        @document_id, @filename, @title, @type, @account_id,
        @status, @authority_level, @effective_date, @superseded_by,
        @content, @summary, @tags
      )
    `);

    const documentsData = [
      {
        document_id: 'DOC-001',
        filename: '01_Support_Policy_v3_CURRENT.pdf',
        title: 'ParcelPilot Support Policy v3',
        type: 'policy',
        account_id: null,
        status: 'CURRENT',
        authority_level: 2,
        effective_date: '2026-05-01',
        superseded_by: null,
        summary: 'Current general support policy defining P1/P2/P3 severity targets, escalation rules, and source precedence.',
        tags: JSON.stringify(['policy', 'sla', 'severity', 'escalation', 'current']),
        content: `ParcelPilot Support Policy v3
Status: CURRENT
Effective: 1 May 2026
Supersedes: Support Policy v2

1. Scope and source precedence
This policy defines default support severity and response targets. A signed customer agreement may override these defaults. When sources conflict, use the signed customer agreement first, then the current support policy, then current product documentation. Historical tickets and internal notes are context only and may contain incorrect past guidance.

2. Severity definitions
● P1 - Critical: Complete production outage preventing all shipment creation for a customer, confirmed security incident or suspected credential exposure, or another event causing immediate material business risk with no workaround.
● P2 - High: Major feature unavailable or materially degraded for a customer, but core operations remain possible or a workaround exists.
● P3 - Normal: Minor defect, how-to question, configuration request, or issue with limited operational impact.

3. Default first-response targets
Plan | P1 | P2 | P3
Enterprise | 30 minutes, 24x7 | 2 hours | 1 business day
Growth | 2 business hours | 4 business hours | 2 business days
Standard | 4 business hours | 1 business day | 2 business days

4. Escalation
P1 incidents should be escalated immediately. If a response target is already breached, the agent should clearly state the breach and recommend escalation rather than hiding uncertainty.`
      },
      {
        document_id: 'DOC-002',
        filename: '02_Support_Policy_v2_DEPRECATED.pdf',
        title: 'ParcelPilot Support Policy v2',
        type: 'policy',
        account_id: null,
        status: 'DEPRECATED',
        authority_level: 4,
        effective_date: '2025-01-01',
        superseded_by: '01_Support_Policy_v3_CURRENT.pdf',
        summary: 'Deprecated support policy. Retained for historical reference only. DO NOT USE FOR CURRENT REQUESTS.',
        tags: JSON.stringify(['policy', 'sla', 'deprecated', 'do-not-use']),
        content: `ParcelPilot Support Policy v2
Status: DEPRECATED - DO NOT USE FOR CURRENT REQUESTS
Effective: 1 January 2025
Superseded by: Support Policy v3 effective 1 May 2026

Severity and response targets
P1 covers complete production outages and severe security incidents. P2 covers major feature degradation. P3 covers minor issues and questions.

Plan | P1 | P2 | P3
Enterprise | 1 hour | 4 hours | 2 business days
Growth | 4 business hours | 1 business day | 3 business days
Standard | 8 business hours | 2 business days | 3 business days

Note: This file is intentionally retained for historical reference and must not be used as current policy.`
      },
      {
        document_id: 'DOC-003',
        filename: '03_Cancellation_and_Service_Credit_SOP_v4.pdf',
        title: 'ParcelPilot Cancellation & Service Credit SOP v4',
        type: 'sop',
        account_id: null,
        status: 'CURRENT',
        authority_level: 2,
        effective_date: '2026-06-15',
        superseded_by: null,
        summary: 'Standard operating procedures for order cancellations and failed-pickup service credit calculations.',
        tags: JSON.stringify(['cancellation', 'service-credit', 'sop', 'refund', 'current']),
        content: `ParcelPilot Cancellation & Service Credit SOP v4
Status: CURRENT
Effective: 15 June 2026

1. Order cancellation
● DRAFT: May be cancelled with no fee.
● BOOKED, not yet PICKED_UP: May be cancelled. No fee within 30 minutes of booking. After 30 minutes, charge INR 250 unless a customer agreement explicitly waives the cancellation fee.
● PICKED_UP: Do not cancel. Use the return-to-origin workflow if the customer wants the parcel returned.
● DELIVERED: Cannot be cancelled.

2. Failed-pickup service credits
Under the default policy, a customer is eligible for a service credit when the pickup is more than 2 hours past the end of the scheduled pickup window, the carrier is at fault, and there is no customer-caused issue. The default credit is the lower of INR 500 or 10% of the shipment fee.
A signed customer agreement may replace the default delay threshold, credit amount, or cap.

3. Approval and uncertainty
● Any individual credit above INR 1,000 requires manager approval.
● Do not promise a credit when carrier fault, pickup timing, or customer fault is unknown.
● When data conflicts, identify the conflict and request verification before a state-changing action.`
      },
      {
        document_id: 'DOC-004',
        filename: '04_Product_Operations_Guide_and_Known_Issues.pdf',
        title: 'ParcelPilot Product Operations Guide',
        type: 'guide',
        account_id: null,
        status: 'CURRENT',
        authority_level: 3,
        effective_date: '2026-08-14',
        superseded_by: null,
        summary: 'Product tier capabilities, known operational issues (KI-208 CSV limit, KI-211 webhook delay), and resolved issues.',
        tags: JSON.stringify(['operations', 'bulk-upload', 'known-issues', 'webhooks', 'current']),
        content: `ParcelPilot Product Operations Guide
Status: CURRENT
Updated: 14 August 2026

1. Plan capabilities
● Bulk Upload: Available on Growth and Enterprise. Supported file size is up to 5,000 rows per CSV.
● Standard: Bulk Upload is not included.
● Shipment status: BOOKED means the shipment is created but ParcelPilot has not yet received a pickup confirmation. PICKED_UP means carrier pickup has been confirmed.

2. Current known issues
KI-208 - Bulk Upload failures on large CSVs
Opened: 10 August 2026
Status: Investigating
Some Growth and Enterprise customers experience intermittent failures on CSV uploads above approximately 3,000 rows, even though the supported product limit remains 5,000 rows. Workaround: split the upload into files below 3,000 rows. Individual shipment creation is unaffected.

KI-211 - SwiftShip pickup webhook delay
Opened: 12 August 2026
Status: Monitoring
SwiftShip pickup confirmation webhooks can arrive up to 20 minutes late. A parcel may physically be collected while ParcelPilot still shows BOOKED. Before telling a customer that a pickup did not occur, verify the carrier status or wait through the known delay window.

3. Resolved issue
KI-176 - Address validation: Resolved 18 July 2026. Do not use this resolved issue to explain new incidents unless evidence specifically matches it.`
      },
      {
        document_id: 'DOC-005',
        filename: '05_Northstar_Logistics_Enterprise_Agreement.pdf',
        title: 'Northstar Logistics Enterprise Agreement',
        type: 'agreement',
        account_id: 'ACCT-001',
        status: 'ACTIVE',
        authority_level: 1,
        effective_date: '2026-01-01',
        superseded_by: null,
        summary: 'Customer-specific Enterprise contract for Northstar Logistics. Overrides SLAs, waives all pre-pickup cancellation fees, monthly credit cap INR 5,000.',
        tags: JSON.stringify(['agreement', 'northstar', 'ACCT-001', 'enterprise', 'sla', 'waiver']),
        content: `ParcelPilot - Northstar Logistics Enterprise Agreement
Account: ACCT-001
Customer: Northstar Logistics
Term: 1 January 2026 to 31 December 2026
Status: ACTIVE

1. Support terms
For Northstar Logistics, the following first-response targets replace ParcelPilot's standard support-policy targets:
● P1: 15 minutes, 24x7
● P2: 1 hour
● P3: 8 business hours

2. Shipment cancellation
Northstar may cancel any BOOKED shipment before pickup with no cancellation fee, regardless of how long ago the shipment was booked. Once a shipment is PICKED_UP, the standard return-to-origin process applies.

3. Service credits
Monthly aggregate service credits are capped at INR 5,000. Unless this agreement states otherwise, the current ParcelPilot service-credit SOP applies.

4. Account contact
Dedicated CSM: Priya Mehta.`
      },
      {
        document_id: 'DOC-006',
        filename: '06_LumenWorks_Service_Agreement.pdf',
        title: 'LumenWorks Service Agreement',
        type: 'agreement',
        account_id: 'ACCT-002',
        status: 'ACTIVE',
        authority_level: 1,
        effective_date: '2026-03-01',
        superseded_by: null,
        summary: 'Customer-specific Growth contract for LumenWorks. Custom SLA targets, custom failed-pickup fixed credit of INR 300 after 4 hours delay.',
        tags: JSON.stringify(['agreement', 'lumenworks', 'ACCT-002', 'growth', 'sla', 'fixed-credit']),
        content: `ParcelPilot - LumenWorks Service Agreement
Account: ACCT-002
Customer: LumenWorks
Plan: Growth
Term: 1 March 2026 to 28 February 2027
Status: ACTIVE

1. Support terms
● P1: 2 business hours
● P2: 4 business hours
● P3: 2 business days
● No weekend or after-hours support coverage.

2. Cancellation terms
No special cancellation-fee waiver applies. Use the current ParcelPilot Cancellation & Service Credit SOP.

3. Failed-pickup credits
If a pickup is more than 4 hours past the end of the scheduled pickup window, the carrier is at fault, and the customer is not at fault, LumenWorks receives a fixed INR 300 service credit. This clause replaces the default failed-pickup credit amount and timing threshold in the SOP.`
      }
    ];

    documentsData.forEach(doc => insertDocument.run(doc));

    // 6. Seed Known Issues
    const insertKnownIssue = db.prepare(`
      INSERT INTO known_issues (
        issue_id, title, status, opened_at, resolved_at,
        affected_carriers, affected_features, symptoms,
        workaround, resolution_details
      ) VALUES (
        @issue_id, @title, @status, @opened_at, @resolved_at,
        @affected_carriers, @affected_features, @symptoms,
        @workaround, @resolution_details
      )
    `);

    const knownIssuesData = [
      {
        issue_id: 'KI-208',
        title: 'Bulk Upload failures on large CSVs',
        status: 'Investigating',
        opened_at: '2026-08-10',
        resolved_at: null,
        affected_carriers: JSON.stringify(['All']),
        affected_features: 'Bulk CSV Upload (Growth & Enterprise plans)',
        symptoms: 'Upload fails at approximately 70% for CSV files with >3,000 rows (supported product limit is 5,000 rows). Single shipment creation works normally.',
        workaround: 'Split bulk upload files into batches of under 3,000 rows each.',
        resolution_details: 'Engineering investigating backend worker memory limits during parsing.'
      },
      {
        issue_id: 'KI-211',
        title: 'SwiftShip pickup webhook delay',
        status: 'Monitoring',
        opened_at: '2026-08-12',
        resolved_at: null,
        affected_carriers: JSON.stringify(['SwiftShip']),
        affected_features: 'Carrier Webhook Status Sync',
        symptoms: 'SwiftShip pickup confirmation webhooks arrive up to 20 minutes late. Parcel physically collected while status in ParcelPilot remains BOOKED.',
        workaround: 'Allow 20-minute buffer after reported pickup before investigating missing pickup status.',
        resolution_details: 'SwiftShip partner engineering notified of queue backlog.'
      },
      {
        issue_id: 'KI-176',
        title: 'Address validation error on PIN codes',
        status: 'Resolved',
        opened_at: '2026-07-01',
        resolved_at: '2026-07-18',
        affected_carriers: JSON.stringify(['All']),
        affected_features: 'Address Validation Service',
        symptoms: 'Invalid postal code rejection for newly added Tier 3 city pin codes.',
        workaround: 'None required (Resolved).',
        resolution_details: 'Postal code database updated on 18 July 2026. Do not use this resolved issue for new incidents.'
      }
    ];

    knownIssuesData.forEach(ki => insertKnownIssue.run(ki));

    // 7. Seed Initial System Audit Log
    const insertAuditLog = db.prepare(`
      INSERT INTO audit_logs (
        log_id, action_id, user_id, user_name, role, account_id,
        action_type, target_entity, target_id, previous_state, new_state,
        authorization_result, policy_reference, notes
      ) VALUES (
        @log_id, @action_id, @user_id, @user_name, @role, @account_id,
        @action_type, @target_entity, @target_id, @previous_state, @new_state,
        @authorization_result, @policy_reference, @notes
      )
    `);

    insertAuditLog.run({
      log_id: 'AUD-INIT-001',
      action_id: null,
      user_id: 'usr_admin',
      user_name: 'System Administrator',
      role: 'admin',
      account_id: null,
      action_type: 'SYSTEM_INITIALIZATION',
      target_entity: 'database',
      target_id: 'parcelpilot.db',
      previous_state: null,
      new_state: 'INITIALIZED',
      authorization_result: 'ALLOWED',
      policy_reference: 'System Setup Protocol v1.0',
      notes: `Database seeded successfully. Snapshot time set to ${CONFIG.REFERENCE_TIMESTAMP}`
    });

  })();

  return { status: 'seeded_successfully', accounts: 4, orders: 6, tickets: 7, documents: 6, known_issues: 3 };
}

// Auto-run seeder if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  console.log('Seeding ParcelPilot database...');
  const res = seedDatabase(true);
  console.log('Seed result:', res);
}
