import { getDatabase } from '../db/database.js';
import { CONFIG } from '../config.js';
import { KnownIssueService } from './knownIssueService.js';
import { CalculationService } from './calculationService.js';

export class ProactiveService {
  /**
   * Get dynamic radar data calculated from database state
   */
  static getRadarInsights() {
    const db = getDatabase();
    const referenceTime = new Date(CONFIG.REFERENCE_TIMESTAMP);

    // 1. Fetch all open tickets joined with account details
    const openTickets = db.prepare(`
      SELECT t.*, a.account_name, a.plan, a.premium_support, a.contract_file
      FROM tickets t
      JOIN accounts a ON t.account_id = a.account_id
      WHERE t.status IN ('open', 'in_progress', 'pending', 'escalated')
      ORDER BY 
        CASE t.priority 
          WHEN 'P1' THEN 1 
          WHEN 'P2' THEN 2 
          ELSE 3 
        END ASC,
        t.created_at ASC
    `).all();

    // 2. Fetch all orders
    const orders = db.prepare(`
      SELECT o.*, a.account_name, a.plan
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
    `).all();

    // 3. Process SLA Tracking per ticket
    const ticketInsights = openTickets.map(ticket => {
      const createdAt = new Date(ticket.created_at);
      const elapsedMinutes = Math.floor((referenceTime.getTime() - createdAt.getTime()) / (1000 * 60));
      
      let targetMinutes = 240; // default 4 hours
      let governingRule = 'Support Policy v3';

      // Determine SLA target based on Account contract or Policy v3
      if (ticket.account_id === 'ACCT-001') { // Northstar Custom Enterprise Agreement
        governingRule = 'Northstar Enterprise Agreement (Section 1)';
        if (ticket.priority === 'P1') targetMinutes = 15; // 15 mins
        else if (ticket.priority === 'P2') targetMinutes = 60; // 1 hour
        else if (ticket.priority === 'P3') targetMinutes = 480; // 8 hours
      } else if (ticket.account_id === 'ACCT-002') { // LumenWorks Growth Agreement
        governingRule = 'LumenWorks Service Agreement (Section 1)';
        if (ticket.priority === 'P1') targetMinutes = 120; // 2 hours
        else if (ticket.priority === 'P2') targetMinutes = 240; // 4 hours
        else targetMinutes = 960; // 2 days
      } else { // Standard Support Policy v3
        governingRule = 'Support Policy v3 (Section 3)';
        if (ticket.plan === 'Enterprise') {
          if (ticket.priority === 'P1') targetMinutes = 30; // 30 mins
          else if (ticket.priority === 'P2') targetMinutes = 120; // 2 hours
          else targetMinutes = 480;
        } else if (ticket.plan === 'Growth') {
          if (ticket.priority === 'P1') targetMinutes = 120;
          else if (ticket.priority === 'P2') targetMinutes = 240;
          else targetMinutes = 960;
        } else { // Standard Plan
          if (ticket.priority === 'P1') targetMinutes = 240;
          else if (ticket.priority === 'P2') targetMinutes = 480;
          else targetMinutes = 960;
        }
      }

      const isBreached = elapsedMinutes > targetMinutes;
      const overdueMinutes = isBreached ? (elapsedMinutes - targetMinutes) : 0;
      const remainingMinutes = !isBreached ? (targetMinutes - elapsedMinutes) : 0;

      // Check Known Issue match
      const kiMatch = KnownIssueService.matchTicket(ticket);

      return {
        ticketId: ticket.ticket_id,
        accountId: ticket.account_id,
        accountName: ticket.account_name,
        plan: ticket.plan,
        priority: ticket.priority,
        subject: ticket.subject,
        description: ticket.description,
        channel: ticket.channel,
        assignedTo: ticket.assigned_to,
        status: ticket.status,
        createdAt: ticket.created_at,
        elapsedMinutes,
        targetMinutes,
        isBreached,
        overdueMinutes,
        remainingMinutes,
        governingRule,
        matchedKnownIssue: kiMatch.bestMatch
      };
    });

    // 4. Group Clusters and Anomalies
    const clusters = [];

    // Cluster A: Production Outage / P1 Incidents
    const p1Tickets = ticketInsights.filter(t => t.priority === 'P1');
    if (p1Tickets.length > 0) {
      clusters.push({
        id: 'CLUST-P1-CRITICAL',
        type: 'OUTAGE_RISK',
        severity: 'CRITICAL',
        title: 'Active P1 Production & Security Incidents',
        description: `${p1Tickets.length} high-severity incidents active requiring immediate engineering & security action.`,
        tickets: p1Tickets.map(t => ({
          ticketId: t.ticketId,
          subject: t.subject,
          account: t.accountName,
          overdueMinutes: t.overdueMinutes,
          isBreached: t.isBreached
        })),
        actionRequired: 'Initiate emergency escalation and credential revocation protocols.'
      });
    }

    // Cluster B: Known Bug Clusters (e.g. CSV upload KI-208)
    const csvBugTickets = ticketInsights.filter(t => t.matchedKnownIssue && t.matchedKnownIssue.issueId === 'KI-208');
    if (csvBugTickets.length > 0) {
      clusters.push({
        id: 'CLUST-KI-208',
        type: 'KNOWN_BUG_CLUSTER',
        severity: 'HIGH',
        title: 'Known Issue Spike: KI-208 Bulk CSV Upload Failures',
        description: `Customer bulk uploads >3,000 rows failing at 70%. Matches active investigation KI-208.`,
        tickets: csvBugTickets.map(t => ({
          ticketId: t.ticketId,
          subject: t.subject,
          account: t.accountName,
          matchScore: t.matchedKnownIssue.matchScore
        })),
        workaround: 'Advise customer to split file into batches under 3,000 rows each.'
      });
    }

    // Cluster C: Webhook Latency / Carrier Sync (KI-211)
    const webhookTickets = ticketInsights.filter(t => t.matchedKnownIssue && t.matchedKnownIssue.issueId === 'KI-211');
    if (webhookTickets.length > 0) {
      clusters.push({
        id: 'CLUST-KI-211',
        type: 'CARRIER_WEBHOOK_DELAY',
        severity: 'MEDIUM',
        title: 'Carrier Status Latency: SwiftShip Webhook Lag (KI-211)',
        description: 'Driver picked up parcel but order status lag is within 20-minute partner queue window.',
        tickets: webhookTickets.map(t => ({
          ticketId: t.ticketId,
          subject: t.subject,
          account: t.accountName,
          matchScore: t.matchedKnownIssue.matchScore
        })),
        workaround: 'Verify carrier portal before marking pickup as missed.'
      });
    }

    // 5. Service Credit Liability Calculation
    let totalCreditLiability = 0;
    const creditEligibleOrders = [];

    orders.forEach(order => {
      if (order.carrier_fault && order.status !== 'CANCELLED') {
        const creditCalc = CalculationService.calculateServiceCredit(order.order_id);
        if (creditCalc.isEligible) {
          totalCreditLiability += creditCalc.creditAmountINR;
          creditEligibleOrders.push(creditCalc);
        }
      }
    });

    // 6. Aggregate Metrics
    const breachedCount = ticketInsights.filter(t => t.isBreached).length;
    const p1Count = p1Tickets.length;
    const totalOpen = ticketInsights.length;

    return {
      referenceSnapshot: CONFIG.REFERENCE_TIMESTAMP,
      summary: {
        totalOpenTickets: totalOpen,
        activeP1Incidents: p1Count,
        breachedSlaTickets: breachedCount,
        activeBugClusters: clusters.length,
        totalCreditLiabilityINR: totalCreditLiability
      },
      ticketInsights,
      clusters,
      creditEligibleOrders,
      generatedAt: new Date().toISOString()
    };
  }
}
