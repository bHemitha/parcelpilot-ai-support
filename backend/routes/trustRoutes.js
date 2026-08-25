import express from 'express';
import { PrecedenceService } from '../services/precedenceService.js';

const router = express.Router();

// GET /api/trust/hierarchy
router.get('/hierarchy', (req, res) => {
  const hierarchy = PrecedenceService.getHierarchyDefinition();
  res.json(hierarchy);
});

export default router;
