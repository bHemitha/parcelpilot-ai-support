import { getDatabase } from '../db/database.js';
import { CalculationService } from './calculationService.js';
import { broadcastEvent } from './eventEmitter.js';
import { v4 as uuidv4 } from 'uuid';

export class ActionService {
  /**
   * Phase 1: Prepare action and generate confirmation token
   */
  static prepareAction(actionType, targetEntity, targetId, payload, user) {
    const db = getDatabase();
    const actionId = `ACT-${uuidv4().substring(0, 8).toUpperCase()}`;
    const token = `CONF-${uuidv4().substring(0, 12)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    let policyJustification = payload.policyJustification || '';
    let estimatedImpact = payload.estimatedImpact || '';
    let targetAccountId = payload.accountId || null;

    // Validate existence and security of target
    if (targetEntity === 'order') {
      const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(targetId);
      if (!order) return { error: 'NOT_FOUND', message: `Order ${targetId} not found.` };
      targetAccountId = order.account_id;

      // Customer authorization check
      if (user.role === 'customer' && user.account_id !== order.account_id) {
        return { error: 'FORBIDDEN', message: 'Unauthorized: Cannot perform actions on orders belonging to other accounts.' };
      }

      if (actionType === 'CANCEL_ORDER') {
        const calc = CalculationService.calculateCancellation(targetId, user.account_id);
        if (!calc.canCancel) {
          return { error: 'INVALID_STATE', message: calc.explanation };
        }
        policyJustification = `${calc.governingAuthority} - ${calc.ruleApplied}`;
        estimatedImpact = `Order ${targetId} status will change to CANCELLED. Cancellation fee: INR ${calc.cancellationFeeINR}.`;
        payload.cancellationFee = calc.cancellationFeeINR;
      } else if (actionType === 'ISSUE_SERVICE_CREDIT') {
        if (user.role === 'customer') {
          return { error: 'FORBIDDEN', message: 'Customers cannot directly issue financial service credits. Request escalation to operations.' };
        }
        const calc = CalculationService.calculateServiceCredit(targetId);
        if (!calc.isEligible) {
          return { error: 'INELIGIBLE', message: calc.explanation };
        }
        if (calc.requiresManagerApproval && user.role !== 'ops_lead' && user.role !== 'admin') {
          return { error: 'MANAGER_APPROVAL_REQUIRED', message: 'Service credits exceeding INR 1,000 require Ops Lead or Manager approval.' };
        }
        policyJustification = `${calc.governingAuthority} - ${calc.explanation}`;
        estimatedImpact = `Credit of INR ${calc.creditAmountINR} will be credited to ${order.account_id}.`;
        payload.creditAmount = calc.creditAmountINR;
      }
    } else if (targetEntity === 'ticket') {
      const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(targetId);
      if (!ticket) return { error: 'NOT_FOUND', message: `Ticket ${targetId} not found.` };
      targetAccountId = ticket.account_id;

      if (user.role === 'customer' && user.account_id !== ticket.account_id) {
        return { error: 'FORBIDDEN', message: 'Unauthorized: Cannot perform actions on tickets belonging to other accounts.' };
      }

      if (actionType === 'ESCALATE_TICKET') {
        policyJustification = payload.policyJustification || 'Support Policy v3 Section 4: Critical incident or SLA breach escalation.';
        estimatedImpact = `Ticket ${targetId} status will become 'escalated' and priority escalated to P1 for immediate engineering response.`;
      } else if (actionType === 'CHANGE_PRIORITY') {
        if (user.role === 'customer' && payload.newPriority === 'P1') {
          // Allow customer to request P1 if critical, with explanation
          policyJustification = 'Customer requested emergency P1 priority adjustment.';
        }
        estimatedImpact = `Ticket ${targetId} priority will update to ${payload.newPriority || 'P1'}.`;
      } else if (actionType === 'ASSIGN_TICKET') {
        if (user.role === 'customer') {
          return { error: 'FORBIDDEN', message: 'Only internal staff can reassign ticket ownership.' };
        }
        estimatedImpact = `Ticket ${targetId} will be reassigned to ${payload.assignee || 'CSM'}.`;
      }
    }

    // Insert into actions and action_confirmations tables
    const insertAction = db.prepare(`
      INSERT INTO actions (
        action_id, action_type, target_entity, target_id, status,
        payload, proposed_by_user_id, proposed_by_role, account_id,
        policy_justification, estimated_impact
      ) VALUES (?, ?, ?, ?, 'PENDING_CONFIRMATION', ?, ?, ?, ?, ?, ?)
    `);

    const insertConf = db.prepare(`
      INSERT INTO action_confirmations (confirmation_id, action_id, token, status, expires_at)
      VALUES (?, ?, ?, 'PENDING', ?)
    `);

    const confirmationId = `CNF-${uuidv4().substring(0, 8).toUpperCase()}`;

    insertAction.run(
      actionId,
      actionType,
      targetEntity,
      targetId,
      JSON.stringify(payload),
      user.user_id,
      user.role,
      targetAccountId,
      policyJustification,
      estimatedImpact
    );

    insertConf.run(confirmationId, actionId, token, expiresAt);

    // Audit log preparation event
    const logId = `AUD-PREP-${uuidv4().substring(0, 8).toUpperCase()}`;
    db.prepare(`
      INSERT INTO audit_logs (
        log_id, action_id, user_id, user_name, role, account_id,
        action_type, target_entity, target_id, authorization_result,
        policy_reference, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'PREPARATION', ?, ?, 'ALLOWED', ?, ?)
    `).run(
      logId,
      actionId,
      user.user_id,
      user.name,
      user.role,
      user.account_id || targetAccountId,
      targetEntity,
      targetId,
      policyJustification,
      `State-changing action ${actionType} prepared for ${targetEntity} ${targetId}. Awaiting explicit confirmation.`
    );

    return {
      actionId,
      confirmationId,
      token,
      actionType,
      targetEntity,
      targetId,
      accountId: targetAccountId,
      status: 'PENDING_CONFIRMATION',
      policyJustification,
      estimatedImpact,
      payload,
      expiresAt,
      requiresConfirmation: true
    };
  }

  /**
   * Phase 2: Confirm and execute action inside a database transaction
   */
  static confirmAction(actionId, user) {
    const db = getDatabase();

    const action = db.prepare('SELECT * FROM actions WHERE action_id = ?').get(actionId);
    if (!action) {
      return { error: 'NOT_FOUND', message: `Action ${actionId} not found.` };
    }

    if (action.status !== 'PENDING_CONFIRMATION') {
      return { error: 'ALREADY_PROCESSED', message: `Action ${actionId} has already been ${action.status.toLowerCase()}.` };
    }

    // Re-verify authorization at execution time
    if (user.role === 'customer' && action.account_id && action.account_id !== user.account_id) {
      return { error: 'FORBIDDEN', message: 'Unauthorized: Cannot execute actions for another account.' };
    }

    const payload = JSON.parse(action.payload || '{}');
    let previousState = '';
    let newState = '';

    const executeTx = db.transaction(() => {
      const timestamp = new Date().toISOString();

      if (action.target_entity === 'order') {
        const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(action.target_id);
        if (!order) throw new Error(`Order ${action.target_id} not found.`);
        previousState = `Status: ${order.status}, FeeCharged: ${order.cancellation_fee_charged}, CreditIssued: ${order.service_credit_issued}`;

        if (action.action_type === 'CANCEL_ORDER') {
          const fee = payload.cancellationFee !== undefined ? payload.cancellationFee : 0;
          db.prepare(`
            UPDATE orders 
            SET status = 'CANCELLED', cancellation_fee_charged = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
          `).run(fee, action.target_id);
          newState = `Status: CANCELLED, FeeCharged: INR ${fee}`;
        } else if (action.action_type === 'ISSUE_SERVICE_CREDIT') {
          const credit = payload.creditAmount || 0;
          db.prepare(`
            UPDATE orders 
            SET service_credit_issued = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
          `).run(credit, action.target_id);
          newState = `Status: ${order.status}, CreditIssued: INR ${credit}`;
        }
      } else if (action.target_entity === 'ticket') {
        const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(action.target_id);
        if (!ticket) throw new Error(`Ticket ${action.target_id} not found.`);
        previousState = `Status: ${ticket.status}, Priority: ${ticket.priority}, AssignedTo: ${ticket.assigned_to}`;

        if (action.action_type === 'ESCALATE_TICKET') {
          db.prepare(`
            UPDATE tickets 
            SET status = 'escalated', priority = 'P1', escalated_at = CURRENT_TIMESTAMP,
                escalation_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
          `).run(action.policy_justification || 'P1 Critical Escalation', action.target_id);
          newState = `Status: escalated, Priority: P1, Reason: ${action.policy_justification}`;
        } else if (action.action_type === 'CHANGE_PRIORITY') {
          const newPriority = payload.newPriority || 'P1';
          db.prepare(`
            UPDATE tickets 
            SET priority = ?, updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
          `).run(newPriority, action.target_id);
          newState = `Status: ${ticket.status}, Priority: ${newPriority}`;
        } else if (action.action_type === 'ASSIGN_TICKET') {
          const assignee = payload.assignee || 'CSM Priya Mehta';
          db.prepare(`
            UPDATE tickets 
            SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
          `).run(assignee, action.target_id);
          newState = `Status: ${ticket.status}, AssignedTo: ${assignee}`;
        }
      }

      // Mark action and confirmation as EXECUTED / CONFIRMED
      db.prepare(`
        UPDATE actions 
        SET status = 'EXECUTED', confirmed_at = CURRENT_TIMESTAMP, executed_at = CURRENT_TIMESTAMP
        WHERE action_id = ?
      `).run(actionId);

      db.prepare(`
        UPDATE action_confirmations
        SET status = 'CONFIRMED'
        WHERE action_id = ?
      `).run(actionId);

      // Create permanent audit log
      const logId = `AUD-EXE-${uuidv4().substring(0, 8).toUpperCase()}`;
      db.prepare(`
        INSERT INTO audit_logs (
          log_id, action_id, user_id, user_name, role, account_id,
          action_type, target_entity, target_id, previous_state, new_state,
          authorization_result, policy_reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'STATE_CHANGE', ?, ?, ?, ?, 'ALLOWED', ?, ?)
      `).run(
        logId,
        actionId,
        user.user_id,
        user.name,
        user.role,
        user.account_id || action.account_id,
        action.target_entity,
        action.target_id,
        previousState,
        newState,
        action.policy_justification,
        `Action ${action.action_type} confirmed and executed by ${user.name} (${user.role}).`
      );

      return { logId, previousState, newState };
    });

    const txResult = executeTx();

    // Broadcast SSE update to all connected browser clients!
    broadcastEvent('STATE_UPDATED', {
      actionId,
      actionType: action.action_type,
      targetEntity: action.target_entity,
      targetId: action.target_id,
      executedBy: user.name,
      newState
    });

    return {
      success: true,
      actionId,
      actionType: action.action_type,
      targetEntity: action.target_entity,
      targetId: action.target_id,
      status: 'EXECUTED',
      previousState: txResult.previousState,
      newState: txResult.newState,
      auditLogId: txResult.logId,
      policyJustification: action.policy_justification,
      message: `Action ${action.action_type} successfully executed on ${action.target_entity} ${action.target_id}.`
    };
  }

  /**
   * Reject action
   */
  static rejectAction(actionId, user, reason = 'User declined execution') {
    const db = getDatabase();
    const action = db.prepare('SELECT * FROM actions WHERE action_id = ?').get(actionId);
    if (!action) return { error: 'NOT_FOUND', message: `Action ${actionId} not found.` };

    db.prepare(`
      UPDATE actions 
      SET status = 'REJECTED', rejected_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE action_id = ?
    `).run(reason, actionId);

    db.prepare(`
      UPDATE action_confirmations SET status = 'REJECTED' WHERE action_id = ?
    `).run(actionId);

    const logId = `AUD-REJ-${uuidv4().substring(0, 8).toUpperCase()}`;
    db.prepare(`
      INSERT INTO audit_logs (
        log_id, action_id, user_id, user_name, role, account_id,
        action_type, target_entity, target_id, authorization_result,
        policy_reference, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'REJECTION', ?, ?, 'ALLOWED', ?, ?)
    `).run(
      logId,
      actionId,
      user.user_id,
      user.name,
      user.role,
      user.account_id || action.account_id,
      action.target_entity,
      action.target_id,
      action.policy_justification,
      `Action ${action.action_type} rejected by ${user.name}. Reason: ${reason}`
    );

    broadcastEvent('STATE_UPDATED', {
      actionId,
      status: 'REJECTED'
    });

    return {
      success: true,
      actionId,
      status: 'REJECTED',
      rejectionReason: reason
    };
  }
}
