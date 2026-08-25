import { getDatabase } from '../backend/db/database.js';
import { seedDatabase } from '../backend/db/seed.js';

async function demonstrateRealtimeBackend() {
  console.log('🔄 Demonstrating Real-Time Dynamic Backend State Mutations...\n');

  // Reseed clean database
  seedDatabase(true);

  // 1. Check Initial State for ORD-1001 (Northstar)
  console.log('--- Step 1: Initial State for ORD-1001 ---');
  let ordRes = await fetch('http://localhost:3001/api/orders/ORD-1001', {
    headers: { 'x-user-id': 'usr_northstar' }
  });
  let ordData = await ordRes.json();
  console.log(`Order ID: ${ordData.order.order_id}`);
  console.log(`Initial Status: ${ordData.order.status}`);
  console.log(`Fee Charged: INR ${ordData.order.cancellation_fee_charged}`);

  // 2. Prepare and Confirm Cancellation Action on ORD-1001
  console.log('\n--- Step 2: Customer Approves Cancellation Action ---');
  const prepRes = await fetch('http://localhost:3001/api/actions/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr_northstar' },
    body: JSON.stringify({
      actionType: 'CANCEL_ORDER',
      targetEntity: 'order',
      targetId: 'ORD-1001',
      payload: { reason: 'Customer requested cancellation' }
    })
  });
  const prepData = await prepRes.json();
  console.log(`Action Prepared: ${prepData.action.actionId} (Status: ${prepData.action.status})`);
  console.log(`Justification: ${prepData.action.policyJustification}`);

  const confRes = await fetch(`http://localhost:3001/api/actions/${prepData.action.actionId}/confirm`, {
    method: 'POST',
    headers: { 'x-user-id': 'usr_northstar' }
  });
  const confData = await confRes.json();
  console.log(`Action Confirmation Result:`, confData.message);

  // 3. Check Order State in Data Explorer API after Confirmation
  console.log('\n--- Step 3: Verifying Order Table Data after Action Execution ---');
  ordRes = await fetch('http://localhost:3001/api/orders/ORD-1001', {
    headers: { 'x-user-id': 'usr_northstar' }
  });
  ordData = await ordRes.json();
  console.log(`Order ID: ${ordData.order.order_id}`);
  console.log(`Updated Status: ${ordData.order.status}  <-- Real Database Mutation!`);
  console.log(`Cancellation Fee Charged: INR ${ordData.order.cancellation_fee_charged} (Waived via Northstar contract)`);

  // 4. Verify Audit Log was generated in SQLite
  console.log('\n--- Step 4: Verifying Audit Log in Security Ledger ---');
  const audRes = await fetch('http://localhost:3001/api/audit-logs', {
    headers: { 'x-user-id': 'usr_admin' }
  });
  const audData = await audRes.json();
  const latestLog = audData.auditLogs[0];
  console.log(`Latest Audit Record: [${latestLog.log_id}]`);
  console.log(`Actor: ${latestLog.user_name} (${latestLog.role})`);
  console.log(`Target: ${latestLog.target_entity} ${latestLog.target_id}`);
  console.log(`State Change: ${latestLog.previous_state} -> ${latestLog.new_state}`);

  // 5. Test Cross-Tenant Security Block
  console.log('\n--- Step 5: Testing Cross-Tenant Scoping (Northstar accessing LumenWorks ORD-2001) ---');
  const scopeRes = await fetch('http://localhost:3001/api/orders/ORD-2001', {
    headers: { 'x-user-id': 'usr_northstar' }
  });
  const scopeData = await scopeRes.json();
  console.log(`HTTP Status: ${scopeRes.status} (${scopeData.error})`);
  console.log(`Security Message: ${scopeData.message}`);

  console.log('\n✅ Real-time backend verification complete!');
  process.exit(0);
}

demonstrateRealtimeBackend();
