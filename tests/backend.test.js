import assert from 'assert';
import { getDatabase } from '../backend/db/database.js';
import { seedDatabase } from '../backend/db/seed.js';
import { CalculationService } from '../backend/services/calculationService.js';
import { PrecedenceService } from '../backend/services/precedenceService.js';
import { KnownIssueService } from '../backend/services/knownIssueService.js';
import { ProactiveService } from '../backend/services/proactiveService.js';
import { ActionService } from '../backend/services/actionService.js';
import { DocumentService } from '../backend/services/documentService.js';

console.log('🧪 Starting ParcelPilot Comprehensive Backend Automated Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${error.message}\n`, error.stack);
  }
}

// 1. Reset and reseed database for clean test run
seedDatabase(true);
const db = getDatabase();

// Test 1: Seed Data Integrity
runTest('Database seeded with required accounts, orders, tickets, documents, and known issues', () => {
  const accounts = db.prepare('SELECT count(*) as count FROM accounts').get().count;
  const orders = db.prepare('SELECT count(*) as count FROM orders').get().count;
  const tickets = db.prepare('SELECT count(*) as count FROM tickets').get().count;
  const docs = db.prepare('SELECT count(*) as count FROM documents').get().count;
  const kis = db.prepare('SELECT count(*) as count FROM known_issues').get().count;

  assert.strictEqual(accounts, 4, 'Should have 4 accounts');
  assert.strictEqual(orders, 6, 'Should have 6 orders');
  assert.strictEqual(tickets, 7, 'Should have 7 tickets');
  assert.strictEqual(docs, 6, 'Should have 6 knowledge documents');
  assert.strictEqual(kis, 3, 'Should have 3 known issues');
});

// Test 2: RBAC & Tenant Isolation Scoping in Document Search
runTest('Customer user can only search general documents and own customer agreement', () => {
  const northstarUser = { role: 'customer', account_id: 'ACCT-001' };
  const northstarDocs = DocumentService.getAll(northstarUser);
  
  // Northstar should see general policies + Northstar agreement (DOC-005), NOT LumenWorks agreement (DOC-006)
  const hasNorthstarDoc = northstarDocs.some(d => d.document_id === 'DOC-005');
  const hasLumenWorksDoc = northstarDocs.some(d => d.document_id === 'DOC-006');
  assert.strictEqual(hasNorthstarDoc, true, 'Northstar should see its own agreement');
  assert.strictEqual(hasLumenWorksDoc, false, 'Northstar MUST NOT see LumenWorks agreement');

  // Internal support agent should see all 6 documents
  const agentUser = { role: 'support_agent', account_id: null };
  const agentDocs = DocumentService.getAll(agentUser);
  assert.strictEqual(agentDocs.length, 6, 'Internal agent should see all 6 documents');
});

// Test 3: Precedence Resolver - Signed Customer Agreement Overrides Standard SOP
runTest('Signed customer agreement (Tier 1) wins over standard SOP (Tier 2)', () => {
  const candidateSources = [
    { title: 'Northstar Agreement Section 2', authorityLevel: 1, status: 'ACTIVE', trustBadge: 'Tier 1' },
    { title: 'Cancellation SOP v4 Section 1', authorityLevel: 2, status: 'CURRENT', trustBadge: 'Tier 2' },
    { title: 'Historical Ticket TKT-450', authorityLevel: 5, status: 'UNTRUSTED_CONTEXT', trustBadge: 'Tier 5' }
  ];

  const resolution = PrecedenceService.resolveConflict(candidateSources, 'cancellation_fee', 'ACCT-001');
  assert.strictEqual(resolution.selectedSource.authorityLevel, 1, 'Agreement must win with Tier 1 authority');
  assert.strictEqual(resolution.rejectedSources.length, 2, 'Other 2 sources must be rejected');
});

// Test 4: Deprecated Policy Never Wins Precedence
runTest('Deprecated Support Policy v2 is guarded and never wins precedence', () => {
  const candidateSources = [
    { title: 'Support Policy v3 (Current)', authorityLevel: 2, status: 'CURRENT', trustBadge: 'Tier 2' },
    { title: 'Support Policy v2 (Deprecated)', authorityLevel: 4, status: 'DEPRECATED', trustBadge: 'Tier 4' }
  ];

  const resolution = PrecedenceService.resolveConflict(candidateSources, 'sla_target', 'ACCT-003');
  assert.strictEqual(resolution.selectedSource.title, 'Support Policy v3 (Current)');
  assert.strictEqual(resolution.explanation.includes('GUARD ACTIVATED'), true, 'Should include deprecation guard explanation');
});

// Test 5: Northstar Order ORD-1001 Cancellation Calculation
runTest('Northstar ORD-1001 cancellation fee is INR 0 due to contract waiver', () => {
  const calc = CalculationService.calculateCancellation('ORD-1001', 'ACCT-001');
  assert.strictEqual(calc.canCancel, true, 'Should be cancellable');
  assert.strictEqual(calc.cancellationFeeINR, 0, 'Cancellation fee must be 0 for Northstar');
  assert.strictEqual(calc.governingTier, 1, 'Governing tier must be Tier 1 Agreement');
});

// Test 6: Standard Order ORD-2001 (LumenWorks) Cancellation Calculation (>30 min)
runTest('ORD-2001 requested 75 mins after booking charges standard INR 250 fee under SOP v4', () => {
  const calc = CalculationService.calculateCancellation('ORD-2001', 'ACCT-002');
  assert.strictEqual(calc.canCancel, true, 'Should be cancellable');
  assert.strictEqual(calc.cancellationFeeINR, 250, 'Cancellation fee must be INR 250 after 30 mins');
  assert.strictEqual(calc.governingTier, 2, 'Governing tier must be Tier 2 SOP v4');
});

// Test 7: Standard Order ORD-3001 Cancellation Calculation (<=30 min)
runTest('ORD-3001 requested 15 mins after booking charges INR 0 fee under SOP v4', () => {
  const calc = CalculationService.calculateCancellation('ORD-3001', 'ACCT-003');
  assert.strictEqual(calc.canCancel, true, 'Should be cancellable');
  assert.strictEqual(calc.cancellationFeeINR, 0, 'Cancellation fee must be INR 0 within 30 mins');
});

// Test 8: LumenWorks ORD-2002 Failed Pickup Service Credit Calculation
runTest('LumenWorks ORD-2002 delay (4.5h > 4h threshold) receives fixed INR 300 credit', () => {
  const credit = CalculationService.calculateServiceCredit('ORD-2002');
  assert.strictEqual(credit.isEligible, true, 'Must be eligible for credit');
  assert.strictEqual(credit.creditAmountINR, 300, 'Credit amount must be fixed INR 300');
  assert.strictEqual(credit.governingTier, 1, 'Governing tier must be Tier 1 LumenWorks Agreement');
});

// Test 9: SLA Breach Calculation for Northstar TKT-501
runTest('Northstar TKT-501 (P1 outage, created 10:30, target 15m) is detected as SLA BREACHED at 11:00', () => {
  const radar = ProactiveService.getRadarInsights();
  const tkt501 = radar.ticketInsights.find(t => t.ticketId === 'TKT-501');
  
  assert.ok(tkt501, 'TKT-501 should be present in open ticket insights');
  assert.strictEqual(tkt501.priority, 'P1', 'TKT-501 is P1');
  assert.strictEqual(tkt501.targetMinutes, 15, 'Northstar P1 SLA is 15 minutes');
  assert.strictEqual(tkt501.elapsedMinutes, 30, '30 minutes elapsed at snapshot 11:00');
  assert.strictEqual(tkt501.isBreached, true, 'TKT-501 MUST be flagged as breached');
  assert.strictEqual(tkt501.overdueMinutes, 15, 'Overdue by 15 minutes');
});

// Test 10: Known Issue Matching Engine for KI-208 and KI-211
runTest('KnownIssueService accurately identifies KI-208 and KI-211 from ticket symptoms', () => {
  const csvMatch = KnownIssueService.matchTicket({
    subject: 'Bulk upload fails for 4,200-row CSV',
    description: 'The CSV reaches roughly 70% and fails. Single shipments work fine.'
  });
  assert.ok(csvMatch.bestMatch, 'Should match a known issue');
  assert.strictEqual(csvMatch.bestMatch.issueId, 'KI-208', 'Must match KI-208');
  assert.ok(csvMatch.bestMatch.matchScore >= 80, 'Score should be >= 80%');

  const webhookMatch = KnownIssueService.matchTicket({
    subject: 'SwiftShip order still shows BOOKED after driver pickup',
    description: 'Driver collected the parcel 10 minutes ago but ParcelPilot shows BOOKED'
  });
  assert.ok(webhookMatch.bestMatch, 'Should match a known issue');
  assert.strictEqual(webhookMatch.bestMatch.issueId, 'KI-211', 'Must match KI-211');
});

// Test 11: 2-Phase State Action Flow (Prepare -> Reject -> State Unchanged)
runTest('State-changing action is NOT executed before confirmation; Rejection leaves state unchanged', () => {
  const user = { user_id: 'usr_northstar', name: 'Northstar Lead', role: 'customer', account_id: 'ACCT-001' };
  
  // 1. Prepare action
  const prep = ActionService.prepareAction('CANCEL_ORDER', 'order', 'ORD-1001', {}, user);
  assert.ok(prep.actionId, 'Action must have an ID');
  assert.strictEqual(prep.status, 'PENDING_CONFIRMATION', 'Initial status must be PENDING_CONFIRMATION');

  // Verify DB state is still BOOKED
  const orderBefore = db.prepare('SELECT status FROM orders WHERE order_id = ?').get('ORD-1001');
  assert.strictEqual(orderBefore.status, 'BOOKED', 'Order status must remain BOOKED prior to confirmation');

  // 2. Reject action
  const rej = ActionService.rejectAction(prep.actionId, user, 'Changed my mind');
  assert.strictEqual(rej.status, 'REJECTED');

  const orderAfterRejection = db.prepare('SELECT status FROM orders WHERE order_id = ?').get('ORD-1001');
  assert.strictEqual(orderAfterRejection.status, 'BOOKED', 'Order status must remain BOOKED after rejection');
});

// Test 12: 2-Phase State Action Flow (Prepare -> Confirm -> Database Mutation & Audit Log)
runTest('State-changing action executes on confirmation, mutates DB state and creates audit record', () => {
  const user = { user_id: 'usr_agent_rohit', name: 'Rohit Sharma', role: 'support_agent', account_id: null };
  
  // 1. Prepare escalation on TKT-501
  const prep = ActionService.prepareAction('ESCALATE_TICKET', 'ticket', 'TKT-501', { policyJustification: 'Emergency P1 Escalation' }, user);
  
  // 2. Confirm action
  const confirmResult = ActionService.confirmAction(prep.actionId, user);
  assert.strictEqual(confirmResult.success, true, 'Confirmation should succeed');
  assert.strictEqual(confirmResult.status, 'EXECUTED');

  // 3. Verify SQLite DB state has changed
  const ticketAfter = db.prepare('SELECT status, priority FROM tickets WHERE ticket_id = ?').get('TKT-501');
  assert.strictEqual(ticketAfter.status, 'escalated', 'Ticket status must now be escalated in SQLite');

  // 4. Verify Audit Log entry exists for the execution
  const auditLog = db.prepare('SELECT * FROM audit_logs WHERE action_id = ? AND action_type = ?').get(prep.actionId, 'STATE_CHANGE');
  assert.ok(auditLog, 'Audit log record must exist');
  assert.strictEqual(auditLog.action_type, 'STATE_CHANGE');
  assert.strictEqual(auditLog.authorization_result, 'ALLOWED');
  assert.strictEqual(auditLog.user_name, 'Rohit Sharma');
});

console.log(`\n========================================`);
console.log(`Test Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
