import express from 'express';
import { getDatabase } from '../db/database.js';
import { checkTenantScope } from '../middleware/auth.js';

const router = express.Router();

// GET /api/accounts - RBAC filtered
router.get('/', (req, res) => {
  const db = getDatabase();
  let accounts = [];

  if (req.user.role === 'customer') {
    accounts = db.prepare('SELECT * FROM accounts WHERE account_id = ?').all(req.user.account_id);
  } else {
    accounts = db.prepare('SELECT * FROM accounts ORDER BY account_id ASC').all();
  }

  res.json({ accounts });
});

// GET /api/accounts/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.params.id);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  if (!checkTenantScope(req, res, account.account_id, 'account', account.account_id)) {
    return;
  }

  res.json({ account });
});

export default router;
