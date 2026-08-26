import express from 'express';
import { AgentService } from '../services/agentService.js';

const router = express.Router();

const handleAgentQuery = async (req, res) => {
  const { query, history } = req.body;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query string is required' });
  }

  try {
    const response = await AgentService.processQuery(query, req.user, history || []);
    res.json(response);
  } catch (error) {
    console.error('Agent execution error:', error);
    res.status(500).json({
      error: 'Agent Reasoning Failed',
      message: error.message
    });
  }
};

// Mount handlers for all variations
router.post('/', handleAgentQuery);
router.post('/query', handleAgentQuery);
router.post('/chat', handleAgentQuery);

export default router;
