import { getDatabase } from '../db/database.js';
import { CONFIG } from '../config.js';

export class CalculationService {
  /**
   * Calculate cancellation fee and eligibility for an order
   * @param {string} orderId 
   * @param {string} requesterAccountId 
   */
  static calculateCancellation(orderId, requesterAccountId) {
    const db = getDatabase();
    const order = db.prepare(`
      SELECT o.*, a.account_name, a.plan, a.contract_file
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
      WHERE o.order_id = ?
    `).get(orderId);

    if (!order) {
      return { error: 'ORDER_NOT_FOUND', message: `Order ${orderId} does not exist.` };
    }

    const referenceTime = new Date(CONFIG.REFERENCE_TIMESTAMP);
    const bookedTime = new Date(order.booked_at);
    const cancelReqTime = order.cancellation_requested_at ? new Date(order.cancellation_requested_at) : referenceTime;

    // Elapsed minutes between booking and cancellation request
    const elapsedMinutes = Math.floor((cancelReqTime.getTime() - bookedTime.getTime()) / (1000 * 60));

    // Base result structure
    const result = {
      orderId: order.order_id,
      accountId: order.account_id,
      accountName: order.account_name,
      orderStatus: order.status,
      bookedAt: order.booked_at,
      cancellationRequestedAt: order.cancellation_requested_at || CONFIG.REFERENCE_TIMESTAMP,
      elapsedMinutesFromBooking: elapsedMinutes,
      shipmentFeeINR: order.shipment_fee_inr,
      canCancel: false,
      cancellationFeeINR: 0,
      governingAuthority: '',
      governingTier: 2,
      ruleApplied: '',
      explanation: '',
      requiresConfirmation: true
    };

    // Rule Evaluation:
    // Status Check
    if (order.status === 'DELIVERED') {
      result.canCancel = false;
      result.governingAuthority = 'Cancellation & Service Credit SOP v4 (Section 1)';
      result.ruleApplied = 'DELIVERED shipments cannot be cancelled.';
      result.explanation = `Order ${orderId} is already DELIVERED. Delivered shipments cannot be cancelled under any circumstance.`;
      return result;
    }

    if (order.status === 'PICKED_UP') {
      result.canCancel = false;
      result.governingAuthority = 'Cancellation & Service Credit SOP v4 (Section 1)';
      result.ruleApplied = 'PICKED_UP shipments cannot be cancelled (Return-to-Origin required).';
      result.explanation = `Order ${orderId} has already been picked up by ${order.carrier} at ${order.pickup_actual_at || 'earlier today'}. Cancellation is not permitted; customer must initiate the Return-To-Origin (RTO) workflow.`;
      return result;
    }

    if (order.status === 'CANCELLED') {
      result.canCancel = false;
      result.governingAuthority = 'System State';
      result.ruleApplied = 'Order is already cancelled.';
      result.explanation = `Order ${orderId} has already been cancelled.`;
      return result;
    }

    // Status is BOOKED or DRAFT
    // Check for Customer Agreement override (Tier 1)
    if (order.account_id === 'ACCT-001') { // Northstar Logistics
      result.canCancel = true;
      result.cancellationFeeINR = 0;
      result.governingAuthority = 'Northstar Logistics Enterprise Agreement (Section 2)';
      result.governingTier = 1;
      result.ruleApplied = 'Full fee waiver for any BOOKED shipment prior to carrier pickup.';
      result.explanation = `Northstar Logistics Enterprise Agreement Section 2 explicitly waives all cancellation fees for BOOKED shipments prior to pickup, regardless of booking duration (${elapsedMinutes} minutes elapsed). Cancellation fee is INR 0.`;
      return result;
    }

    // Standard Policy (Cancellation & Service Credit SOP v4)
    result.governingAuthority = 'Cancellation & Service Credit SOP v4 (Section 1)';
    result.governingTier = 2;
    result.canCancel = true;

    if (elapsedMinutes <= 30) {
      result.cancellationFeeINR = 0;
      result.ruleApplied = 'Free cancellation within 30 minutes of booking.';
      result.explanation = `Order ${orderId} was requested for cancellation within 30 minutes of booking (${elapsedMinutes} mins elapsed). Under SOP v4 Section 1, no cancellation fee applies.`;
    } else {
      result.cancellationFeeINR = 250;
      result.ruleApplied = 'Standard INR 250 cancellation fee applied after 30 minutes of booking.';
      result.explanation = `Order ${orderId} was requested for cancellation ${elapsedMinutes} minutes after booking (> 30 mins). Under standard SOP v4 Section 1, a cancellation fee of INR 250 applies.`;
    }

    return result;
  }

  /**
   * Calculate failed-pickup service credit eligibility
   * @param {string} orderId 
   */
  static calculateServiceCredit(orderId) {
    const db = getDatabase();
    const order = db.prepare(`
      SELECT o.*, a.account_name, a.plan, a.contract_file
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
      WHERE o.order_id = ?
    `).get(orderId);

    if (!order) {
      return { error: 'ORDER_NOT_FOUND', message: `Order ${orderId} does not exist.` };
    }

    const referenceTime = new Date(CONFIG.REFERENCE_TIMESTAMP);
    const windowEnd = new Date(order.pickup_window_end);
    const delayHours = (referenceTime.getTime() - windowEnd.getTime()) / (1000 * 60 * 60);

    const result = {
      orderId: order.order_id,
      accountId: order.account_id,
      accountName: order.account_name,
      carrier: order.carrier,
      scheduledWindowEnd: order.pickup_window_end,
      referenceTime: CONFIG.REFERENCE_TIMESTAMP,
      delayHours: parseFloat(delayHours.toFixed(2)),
      carrierFault: Boolean(order.carrier_fault),
      customerFault: Boolean(order.customer_fault),
      shipmentFeeINR: order.shipment_fee_inr,
      isEligible: false,
      creditAmountINR: 0,
      governingAuthority: '',
      governingTier: 2,
      requiresManagerApproval: false,
      explanation: ''
    };

    // If carrier is not at fault or customer is at fault
    if (!order.carrier_fault) {
      result.isEligible = false;
      result.explanation = `Carrier fault is not established or confirmed false. Service credit cannot be issued without carrier fault.`;
      result.governingAuthority = 'Cancellation & Service Credit SOP v4 (Section 2 & 3)';
      return result;
    }

    if (order.customer_fault) {
      result.isEligible = false;
      result.explanation = `Customer-caused delay or fault detected. Service credits are voided when customer is at fault.`;
      result.governingAuthority = 'Cancellation & Service Credit SOP v4 (Section 2)';
      return result;
    }

    // Check Account Specific Agreement Override (Tier 1)
    if (order.account_id === 'ACCT-002') { // LumenWorks
      result.governingAuthority = 'LumenWorks Service Agreement (Section 3)';
      result.governingTier = 1;

      // LumenWorks clause: pickup > 4 hours past scheduled window end, carrier fault, no customer fault => FIXED INR 300
      if (delayHours > 4) {
        result.isEligible = true;
        result.creditAmountINR = 300;
        result.requiresManagerApproval = false; // 300 <= 1000
        result.explanation = `LumenWorks contract Section 3 replaces SOP rules: Pickup delay of ${result.delayHours} hours exceeds the 4-hour contractual threshold with carrier fault. Eligible for fixed contractual credit of INR 300.`;
      } else {
        result.isEligible = false;
        result.creditAmountINR = 0;
        result.explanation = `Pickup delay is ${result.delayHours} hours, which has not yet exceeded LumenWorks' 4-hour threshold.`;
      }
      return result;
    }

    // Default SOP v4 (Tier 2)
    // Pickup > 2 hours past scheduled window end => lower of INR 500 or 10% of shipment fee
    result.governingAuthority = 'Cancellation & Service Credit SOP v4 (Section 2)';
    result.governingTier = 2;

    if (delayHours > 2) {
      result.isEligible = true;
      const tenPercent = Math.round(order.shipment_fee_inr * 0.10);
      result.creditAmountINR = Math.min(500, tenPercent);
      result.requiresManagerApproval = result.creditAmountINR > 1000;
      result.explanation = `Pickup delay of ${result.delayHours} hours exceeds the 2-hour standard delay threshold with carrier fault. Eligible for min(INR 500, 10% of INR ${order.shipment_fee_inr}) = INR ${result.creditAmountINR}.`;
    } else {
      result.isEligible = false;
      result.creditAmountINR = 0;
      result.explanation = `Pickup delay (${result.delayHours} hours) has not reached the 2-hour delay threshold under SOP v4.`;
    }

    return result;
  }
}
