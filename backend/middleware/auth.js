import { CONFIG } from '../config.js';
import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export function authMiddleware(req, res, next) {
  const db = getDatabase();
  
  // Look for authorization header or x-user-id / x-demo-token
  const authHeader = req.headers.authorization;
  const customUserId = req.headers['x-user-id'];
  const demoToken = req.headers['x-demo-token'] || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

  let user = null;

  if (demoToken) {
    user = db.prepare(`
      SELECT u.user_id, u.name, u.email, u.role, u.account_id, a.account_name, a.plan
      FROM users u
      LEFT JOIN accounts a ON u.account_id = a.account_id
      WHERE u.token = ?
    `).get(demoToken);
  } else if (customUserId) {
    user = db.prepare(`
      SELECT u.user_id, u.name, u.email, u.role, u.account_id, a.account_name, a.plan
      FROM users u
      LEFT JOIN accounts a ON u.account_id = a.account_id
      WHERE u.user_id = ?
    `).get(customUserId);
  }

  // Fallback to default user if not specified (e.g. Northstar Customer or Ops Lead depending on demo setup)
  if (!user) {
    // Default to Northstar customer user
    user = {
      user_id: 'usr_northstar',
      name: 'Northstar Logistics Operations',
      email: 'ops@northstarlogistics.com',
      role: 'customer',
      account_id: 'ACCT-001',
      account_name: 'Northstar Logistics',
      plan: 'Enterprise'
    };
  }

  req.user = user;
  next();
}

/**
 * Enforce Tenant Isolation Scope
 * If user is customer and resource belongs to a different account, reject with 403 and create an audit log.
 */
export function checkTenantScope(req, res, targetAccountId, targetEntity = 'record', targetId = 'unknown') {
  if (req.user.role === 'customer') {
    if (!targetAccountId || targetAccountId !== req.user.account_id) {
      // Record security violation audit log
      const db = getDatabase();
      const logId = `AUD-SEC-${uuidv4().substring(0, 8).toUpperCase()}`;
      try {
        db.prepare(`
          INSERT INTO audit_logs (
            log_id, action_id, user_id, user_name, role, account_id,
            action_type, target_entity, target_id, authorization_result,
            policy_reference, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          null,
          req.user.user_id,
          req.user.name,
          req.user.role,
          req.user.account_id,
          'SECURITY_VIOLATION',
          targetEntity,
          targetId,
          'DENIED',
          'Tenant Isolation Policy v1.0',
          `Unauthorized cross-tenant access attempt: User ${req.user.name} (${req.user.account_id}) attempted to access ${targetEntity} ${targetId} belonging to ${targetAccountId || 'Unknown'}`
        );
      } catch (err) {
        console.error('Failed to log security violation:', err);
      }

      res.status(403).json({
        error: 'Forbidden: Scope Violation',
        message: `Access denied. Your account (${req.user.account_id}) is not authorized to access resources belonging to ${targetAccountId || 'another tenant'}.`,
        tenant_violation: true,
        requested_account: targetAccountId,
        user_account: req.user.account_id
      });
      return false;
    }
  }
  return true;
}

/**
 * Require Internal Role Middleware
 */
export function requireInternalRole(req, res, next) {
  if (req.user.role === 'customer') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Internal ParcelPilot operations privileges required for this action.'
    });
  }
  next();
}
