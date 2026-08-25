import express from 'express';
import { KnownIssueService } from '../services/knownIssueService.js';

const router = express.Router();

// GET /api/known-issues
router.get('/', (req, res) => {
  const issues = KnownIssueService.getAllKnownIssues();
  res.json({
    knownIssues: issues.map(k => ({
      ...k,
      affected_carriers: k.affected_carriers ? JSON.parse(k.affected_carriers) : []
    }))
  });
});

// POST /api/known-issues/match
router.post('/match', (req, res) => {
  const { text, ticket } = req.body;
  const matchResult = KnownIssueService.matchTicket(ticket || text || '');
  res.json(matchResult);
});

export default router;
