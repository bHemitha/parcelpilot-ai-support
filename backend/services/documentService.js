import { getDatabase } from '../db/database.js';

export class DocumentService {
  /**
   * Search documents in the database
   * @param {string} query - search terms
   * @param {object} user - authenticated user context { role, account_id }
   * @param {object} options - filters like type, status
   */
  static search(query, user, options = {}) {
    const db = getDatabase();
    
    // RBAC filtering: customer sees general docs + own agreement only; internal sees all
    let sql = `SELECT * FROM documents WHERE 1=1`;
    const params = [];

    if (user && user.role === 'customer') {
      sql += ` AND (account_id IS NULL OR account_id = ?)`;
      params.push(user.account_id);
    }

    if (options.status) {
      sql += ` AND status = ?`;
      params.push(options.status);
    }

    if (options.type) {
      sql += ` AND type = ?`;
      params.push(options.type);
    }

    const allDocs = db.prepare(sql).all(...params);

    if (!query || query.trim() === '') {
      return allDocs.map(doc => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : []
      }));
    }

    const searchTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const scoredDocs = allDocs.map(doc => {
      let score = 0;
      const lowerContent = doc.content.toLowerCase();
      const lowerTitle = doc.title.toLowerCase();
      const lowerSummary = (doc.summary || '').toLowerCase();

      searchTokens.forEach(token => {
        if (lowerTitle.includes(token)) score += 10;
        if (lowerSummary.includes(token)) score += 5;
        
        // Count occurrences in content
        const matches = (lowerContent.match(new RegExp(token, 'g')) || []).length;
        score += matches;
      });

      // Boost current/active documents over deprecated ones
      if (doc.status === 'CURRENT' || doc.status === 'ACTIVE') {
        score += 3;
      } else if (doc.status === 'DEPRECATED') {
        score -= 5;
      }

      // Boost customer agreement if customer specific
      if (user && user.account_id && doc.account_id === user.account_id) {
        score += 8;
      }

      return {
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : [],
        relevance_score: score
      };
    });

    return scoredDocs
      .filter(d => d.relevance_score > 0 || searchTokens.length === 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Get all documents with RBAC check
   */
  static getAll(user) {
    return this.search('', user);
  }

  /**
   * Get document by ID with RBAC check
   */
  static getById(documentId, user) {
    const db = getDatabase();
    const doc = db.prepare('SELECT * FROM documents WHERE document_id = ?').get(documentId);
    if (!doc) return null;

    if (user && user.role === 'customer') {
      if (doc.account_id && doc.account_id !== user.account_id) {
        return { error: 'FORBIDDEN', message: 'Unauthorized access to customer agreement' };
      }
    }

    return {
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags) : []
    };
  }
}
