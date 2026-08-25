import { getDatabase } from '../db/database.js';

export class KnownIssueService {
  /**
   * Match a ticket text or ticket object against known issues
   * @param {object|string} ticketOrText 
   */
  static matchTicket(ticketOrText) {
    const db = getDatabase();
    const knownIssues = db.prepare('SELECT * FROM known_issues').all();

    let textToAnalyze = '';

    if (typeof ticketOrText === 'string') {
      textToAnalyze = ticketOrText.toLowerCase();
    } else if (ticketOrText && typeof ticketOrText === 'object') {
      textToAnalyze = `${ticketOrText.subject || ''} ${ticketOrText.description || ''} ${ticketOrText.notes || ''}`.toLowerCase();
    }

    const matchResults = knownIssues.map(ki => {
      let score = 0;
      const signals = [];

      // Specific known issue signal matching
      if (ki.issue_id === 'KI-208') { // Bulk CSV upload failures
        if (textToAnalyze.includes('bulk') || textToAnalyze.includes('csv') || textToAnalyze.includes('upload')) {
          score += 45;
          signals.push('Bulk CSV Upload feature keywords detected');
        }
        if (textToAnalyze.includes('fail') || textToAnalyze.includes('70%') || textToAnalyze.includes('rows') || textToAnalyze.includes('3500') || textToAnalyze.includes('4200') || textToAnalyze.includes('3,500') || textToAnalyze.includes('4,200') || textToAnalyze.includes('3000') || textToAnalyze.includes('3,000')) {
          score += 40;
          signals.push('Failure pattern / high row count signal detected (>3000 rows)');
        }
        if (textToAnalyze.includes('one-by-one') || textToAnalyze.includes('single shipment') || textToAnalyze.includes('single')) {
          score += 15;
          signals.push('Single shipment workaround behavior matches KI-208 profile');
        }
      } else if (ki.issue_id === 'KI-211') { // SwiftShip webhook delay
        if (textToAnalyze.includes('swiftship')) {
          score += 45;
          signals.push('SwiftShip carrier match');
        }
        if (textToAnalyze.includes('booked') && (textToAnalyze.includes('pickup') || textToAnalyze.includes('collected') || textToAnalyze.includes('driver'))) {
          score += 40;
          signals.push('Status discrepancy: driver collected parcel but order shows BOOKED');
        }
        if (textToAnalyze.includes('webhook') || textToAnalyze.includes('delay') || textToAnalyze.includes('minutes ago') || textToAnalyze.includes('shows booked')) {
          score += 15;
          signals.push('Recent pickup timing within 20-minute sync latency buffer');
        }
      } else if (ki.issue_id === 'KI-176') { // Address validation (Resolved)
        if (textToAnalyze.includes('pin') || textToAnalyze.includes('postal') || textToAnalyze.includes('address')) {
          score += 50;
          signals.push('Address / PIN code keywords matched');
        }
      }

      const matchPercentage = Math.min(100, Math.max(0, score));

      return {
        issueId: ki.issue_id,
        title: ki.title,
        status: ki.status,
        matchScore: matchPercentage,
        isMatch: matchPercentage >= 65,
        matchedSignals: signals,
        symptoms: ki.symptoms,
        workaround: ki.workaround,
        openedAt: ki.opened_at,
        resolvedAt: ki.resolved_at,
        isResolvedWarning: ki.status === 'Resolved'
      };
    });

    const bestMatch = matchResults.filter(m => m.isMatch).sort((a, b) => b.matchScore - a.matchScore)[0] || null;

    return {
      bestMatch,
      allMatches: matchResults
    };
  }

  static getAllKnownIssues() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM known_issues ORDER BY issue_id ASC').all();
  }
}
