import express from 'express';
import { addClient } from '../services/eventEmitter.js';

const router = express.Router();

// GET /api/events - Server-Sent Events stream
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to ParcelPilot SSE Event Stream', timestamp: new Date().toISOString() })}\n\n`);

  addClient(res);

  // Send heartbeat every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

export default router;
