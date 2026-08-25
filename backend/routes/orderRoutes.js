import express from 'express';
import { getDatabase } from '../db/database.js';
import { checkTenantScope } from '../middleware/auth.js';
import { CalculationService } from '../services/calculationService.js';

const router = express.Router();

// GET /api/orders
router.get('/', (req, res) => {
  const db = getDatabase();
  let orders = [];

  if (req.user.role === 'customer') {
    orders = db.prepare(`
      SELECT o.*, a.account_name, a.plan
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
      WHERE o.account_id = ?
      ORDER BY o.booked_at DESC
    `).all(req.user.account_id);
  } else {
    orders = db.prepare(`
      SELECT o.*, a.account_name, a.plan
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
      ORDER BY o.booked_at DESC
    `).all();
  }

  res.json({ orders });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const order = db.prepare(`
    SELECT o.*, a.account_name, a.plan
    FROM orders o
    JOIN accounts a ON o.account_id = a.account_id
    WHERE o.order_id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (!checkTenantScope(req, res, order.account_id, 'order', order.order_id)) {
    return;
  }

  res.json({ order });
});

// GET /api/orders/:id/cancellation-estimate
router.get('/:id/cancellation-estimate', (req, res) => {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!checkTenantScope(req, res, order.account_id, 'order', order.order_id)) {
    return;
  }

  const estimate = CalculationService.calculateCancellation(order.order_id, req.user.account_id);
  res.json({ estimate });
});

// GET /api/orders/:id/credit-estimate
router.get('/:id/credit-estimate', (req, res) => {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!checkTenantScope(req, res, order.account_id, 'order', order.order_id)) {
    return;
  }

  const estimate = CalculationService.calculateServiceCredit(order.order_id);
  res.json({ estimate });
});

export default router;
