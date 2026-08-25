import express from 'express';
import { getDatabase } from '../db/database.js';
import { checkTenantScope } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tickets
router.get('/', (req, res) => {
  const db = getDatabase();
  let tickets = [];

  if (req.user.role === 'customer') {
    tickets = db.prepare(`
      SELECT t.*, a.account_name, a.plan
      FROM tickets t
      JOIN accounts a ON t.account_id = a.account_id
      WHERE t.account_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.account_id);
  } else {
    tickets = db.prepare(`
      SELECT t.*, a.account_name, a.plan
      FROM tickets t
      JOIN accounts a ON t.account_id = a.account_id
      ORDER BY t.created_at DESC
    `).all();
  }

  res.json({ tickets });
});

// GET /api/tickets/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const ticket = db.prepare(`
    SELECT t.*, a.account_name, a.plan
    FROM tickets t
    JOIN accounts a ON t.account_id = a.account_id
    WHERE t.ticket_id = ?
  `).get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  if (!checkTenantScope(req, res, ticket.account_id, 'ticket', ticket.ticket_id)) {
    return;
  }

  res.json({ ticket });
});

export default router;
