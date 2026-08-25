import express from 'express';
import { ProactiveService } from '../services/proactiveService.js';

const router = express.Router();

// GET /api/proactive/radar
router.get('/radar', (req, res) => {
  const insights = ProactiveService.getRadarInsights();
  res.json(insights);
});

export default router;
