import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { seedDatabase } from './db/seed.js';
import { authMiddleware } from './middleware/auth.js';

// Import Route Handlers
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import knownIssueRoutes from './routes/knownIssueRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import actionRoutes from './routes/actionRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import proactiveRoutes from './routes/proactiveRoutes.js';
import trustRoutes from './routes/trustRoutes.js';
import eventRoutes from './routes/eventRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Public SSE event route before auth middleware for easy browser EventSource subscription
app.use('/api/events', eventRoutes);

// Auth middleware for all API routes
app.use('/api', authMiddleware);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/known-issues', knownIssueRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/proactive', proactiveRoutes);
app.use('/api/trust', trustRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ParcelPilot AI Support Backend',
    version: '1.0.0',
    referenceSnapshot: CONFIG.REFERENCE_TIMESTAMP,
    timestamp: new Date().toISOString()
  });
});

// Production Static Serving for Single-URL Cloud Deployments (Render, Railway, Vercel, Fly.io, etc.)
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Auto-seed database on server start if not yet populated
seedDatabase(false);

const PORT = CONFIG.PORT;
export const server = app.listen(PORT, () => {
  console.log(`🚀 ParcelPilot AI Support Backend running on http://localhost:${PORT}`);
  console.log(`⏱️ Reference Snapshot Time: ${CONFIG.REFERENCE_TIMESTAMP}`);
});

export default app;
