import express from 'express';
import { getDatabase } from '../db/database.js';

const router = express.Router();

// GET /api/audit-logs
router.get('/', (req, res) => {
  const db = getDatabase();
  let logs = [];

  if (req.user.role === 'customer') {
    logs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE account_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(req.user.account_id);
  } else {
    logs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `).all();
  }

  res.json({ auditLogs: logs });
});

export default router;
