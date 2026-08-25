import http from 'http';
import app from '../backend/server.js';

// Test API Endpoints
async function testServer() {
  console.log('Testing live Express server endpoints...\n');

  const req1 = await fetch('http://localhost:3001/api/health');
  const res1 = await req1.json();
  console.log('Health Check:', res1);

  const req2 = await fetch('http://localhost:3001/api/proactive/radar');
  const res2 = await req2.json();
  console.log('Proactive Radar Summary:', res2.summary);

  const req3 = await fetch('http://localhost:3001/api/agent/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr_northstar'
    },
    body: JSON.stringify({
      query: 'Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.'
    })
  });
  const res3 = await req3.json();
  console.log('\nAgent Query Response (Northstar Cancellation):');
  console.log('Trust Badge:', res3.trustBadge);
  console.log('Tools Executed:', res3.toolTrace?.map(t => t.tool));
  console.log('Answer Preview:\n', res3.answer?.substring(0, 300) + '...');

  process.exit(0);
}

// Give server 500ms to bind
setTimeout(testServer, 500);
