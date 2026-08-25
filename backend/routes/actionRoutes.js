import express from 'express';
import { ActionService } from '../services/actionService.js';
import { getDatabase } from '../db/database.js';

const router = express.Router();

// POST /api/actions/prepare
router.post('/prepare', (req, res) => {
  const { actionType, targetEntity, targetId, payload } = req.body;
  if (!actionType || !targetEntity || !targetId) {
    return res.status(400).json({ error: 'Missing required parameters: actionType, targetEntity, targetId' });
  }

  const result = ActionService.prepareAction(actionType, targetEntity, targetId, payload || {}, req.user);
  if (result.error) {
    const statusCode = result.error === 'FORBIDDEN' ? 403 : (result.error === 'NOT_FOUND' ? 404 : 400);
    return res.status(statusCode).json(result);
  }

  res.json({ action: result });
});

// POST /api/actions/:id/confirm
router.post('/:id/confirm', (req, res) => {
  const actionId = req.params.id;
  const result = ActionService.confirmAction(actionId, req.user);

  if (result.error) {
    const statusCode = result.error === 'FORBIDDEN' ? 403 : (result.error === 'NOT_FOUND' ? 404 : 400);
    return res.status(statusCode).json(result);
  }

  res.json(result);
});

// POST /api/actions/:id/reject
router.post('/:id/reject', (req, res) => {
  const actionId = req.params.id;
  const reason = req.body.reason || 'Declined by user';
  const result = ActionService.rejectAction(actionId, req.user, reason);

  if (result.error) {
    return res.status(404).json(result);
  }

  res.json(result);
});

// GET /api/actions/pending
router.get('/pending', (req, res) => {
  const db = getDatabase();
  let actions = [];

  if (req.user.role === 'customer') {
    actions = db.prepare(`
      SELECT a.*, c.token as confirmation_token, c.expires_at
      FROM actions a
      JOIN action_confirmations c ON a.action_id = c.action_id
      WHERE a.status = 'PENDING_CONFIRMATION' AND a.account_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.account_id);
  } else {
    actions = db.prepare(`
      SELECT a.*, c.token as confirmation_token, c.expires_at
      FROM actions a
      JOIN action_confirmations c ON a.action_id = c.action_id
      WHERE a.status = 'PENDING_CONFIRMATION'
      ORDER BY a.created_at DESC
    `).all();
  }

  res.json({
    pendingActions: actions.map(a => ({
      ...a,
      payload: JSON.parse(a.payload || '{}')
    }))
  });
});

export default router;
