import express from 'express';
import { DocumentService } from '../services/documentService.js';

const router = express.Router();

// GET /api/documents
router.get('/', (req, res) => {
  const query = req.query.q || '';
  const status = req.query.status || null;
  const type = req.query.type || null;

  const docs = DocumentService.search(query, req.user, { status, type });
  res.json({ documents: docs });
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const doc = DocumentService.getById(req.params.id, req.user);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.error) return res.status(403).json(doc);

  res.json({ document: doc });
});

export default router;
