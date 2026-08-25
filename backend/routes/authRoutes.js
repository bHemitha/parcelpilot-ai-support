import express from 'express';
import { CONFIG } from '../config.js';
import { getDatabase } from '../db/database.js';

const router = express.Router();

// Get current authenticated user
router.get('/me', (req, res) => {
  res.json({
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// List all switchable demo personas
router.get('/identities', (req, res) => {
  const db = getDatabase();
  const users = db.prepare(`
    SELECT u.user_id, u.name, u.email, u.role, u.account_id, a.account_name, a.plan, u.token
    FROM users u
    LEFT JOIN accounts a ON u.account_id = a.account_id
    ORDER BY 
      CASE u.role 
        WHEN 'customer' THEN 1 
        WHEN 'support_agent' THEN 2 
        WHEN 'ops_lead' THEN 3 
        ELSE 4 
      END ASC
  `).all();

  res.json({
    identities: users,
    activeUserId: req.user ? req.user.user_id : null
  });
});

// Switch session identity
router.post('/switch-session', (req, res) => {
  const { userId, token } = req.body;
  const db = getDatabase();

  let user = null;
  if (token) {
    user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
  } else if (userId) {
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }

  if (!user) {
    return res.status(404).json({ error: 'User identity not found.' });
  }

  const account = user.account_id ? db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(user.account_id) : null;

  res.json({
    success: true,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      account_id: user.account_id,
      account_name: account ? account.account_name : 'ParcelPilot Operations',
      plan: account ? account.plan : 'Internal',
      token: user.token
    },
    message: `Switched session to ${user.name} (${user.role})`
  });
});

export default router;
