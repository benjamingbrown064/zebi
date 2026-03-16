/**
 * Date Parser for Brain Dump
 * Converts natural language dates to ISO 8601 format
 */

import * as chrono from 'chrono-node';

export interface ParsedDate {
  iso: string; // ISO 8601 format for database
  date: Date; // JavaScript Date object
  confidence: number; // 0.0-1.0
  source: 'explicit' | 'inferred'; // How the date was determined
  originalText: string; // Original phrase from transcript
  ambiguous: boolean; // If true, needs user review
}

/**
 * Parse natural language date to ISO format
 */
export function parseDate(
  dateText: string,
  referenceDate?: Date
): ParsedDate | null {
  const reference = referenceDate || new Date();
  
  try {
    // Handle business-specific phrases
    const businessDate = parseBusinessDate(dateText, reference);
    if (businessDate) return businessDate;

    // Use chrono for natural language parsing
    const results = chrono.parse(dateText, reference, { forwardDate: true });
    
    if (results.length === 0) return null;

    const parsed = results[0];
    const date = parsed.start.date();
    
    // Determine confidence based on parsing certainty
    let confidence = 0.8;
    const lowerText = dateText.toLowerCase();
    
    // High confidence for explicit dates
    if (lowerText.match(/\d{4}-\d{2}-\d{2}/) || 
        lowerText.match(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/) ||
        lowerText.match(/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
      confidence = 0.95;
    }
    
    // Medium confidence for relative dates
    if (lowerText.match(/tomorrow|yesterday|next|last/)) {
      confidence = 0.85;
    }
    
    // Lower confidence for vague dates
    if (lowerText.match(/soon|later|sometime|eventually/)) {
      confidence = 0.5;
    }

    // Check if ambiguous (multiple interpretations possible)
    const ambiguous = results.length > 1 || 
                     confidence < 0.7 ||
                     !!lowerText.match(/maybe|possibly|around|roughly|about/);

    return {
      iso: date.toISOString(),
      date,
      confidence,
      source: confidence > 0.8 ? 'explicit' : 'inferred',
      originalText: dateText,
      ambiguous
    };
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}

/**
 * Parse business-specific date phrases
 */
function parseBusinessDate(
  text: string,
  reference: Date
): ParsedDate | null {
  const lower = text.toLowerCase().trim();
  let targetDate: Date | null = null;
  let confidence = 0.9;
  let source: 'explicit' | 'inferred' = 'explicit';

  // End of day (today at 5pm)
  if (lower === 'eod' || lower === 'end of day') {
    targetDate = new Date(reference);
    targetDate.setHours(17, 0, 0, 0);
  }
  
  // End of week (this Friday at 5pm)
  if (lower === 'eow' || lower === 'end of week') {
    targetDate = getNextDayOfWeek(reference, 5); // Friday
    targetDate.setHours(17, 0, 0, 0);
  }
  
  // End of month
  if (lower === 'eom' || lower === 'end of month') {
    targetDate = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    targetDate.setHours(17, 0, 0, 0);
  }
  
  // End of quarter
  if (lower === 'eoq' || lower === 'end of quarter') {
    const quarter = Math.floor(reference.getMonth() / 3);
    const lastMonthOfQuarter = (quarter + 1) * 3;
    targetDate = new Date(reference.getFullYear(), lastMonthOfQuarter, 0);
    targetDate.setHours(17, 0, 0, 0);
  }
  
  // Next quarter (start of next quarter)
  if (lower === 'next quarter' || lower === 'q1' || lower === 'q2' || lower === 'q3' || lower === 'q4') {
    let quarter: number;
    
    if (lower === 'next quarter') {
      quarter = (Math.floor(reference.getMonth() / 3) + 1) % 4;
    } else {
      quarter = parseInt(lower.charAt(1)) - 1; // Q1=0, Q2=1, etc.
    }
    
    const firstMonthOfQuarter = quarter * 3;
    targetDate = new Date(reference.getFullYear(), firstMonthOfQuarter, 1);
    
    // If the quarter has already passed this year, use next year
    if (targetDate < reference) {
      targetDate.setFullYear(reference.getFullYear() + 1);
    }
    
    targetDate.setHours(9, 0, 0, 0); // Start of business day
    confidence = 0.85;
    source = 'inferred';
  }

  if (!targetDate) return null;

  return {
    iso: targetDate.toISOString(),
    date: targetDate,
    confidence,
    source,
    originalText: text,
    ambiguous: false
  };
}

/**
 * Get next occurrence of a day of week (0=Sunday, 6=Saturday)
 */
function getNextDayOfWeek(reference: Date, targetDay: number): Date {
  const result = new Date(reference);
  const currentDay = result.getDay();
  const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; // If today, get next week
  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Parse multiple date references from text
 */
export function parseDatesFromText(
  text: string,
  referenceDate?: Date
): ParsedDate[] {
  const reference = referenceDate || new Date();
  const results: ParsedDate[] = [];
  
  // Find all potential date phrases
  const datePatterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g, // ISO dates
    /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, // Slash dates
    /\b(tomorrow|yesterday|today)\b/gi,
    /\b(next|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year)\b/gi,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?\b/gi,
    /\bin\s+\d+\s+(day|week|month|year)s?\b/gi,
    /\b(eod|eow|eom|eoq|end of day|end of week|end of month|end of quarter)\b/gi,
    /\b(q1|q2|q3|q4|next quarter)\b/gi,
  ];

  const foundPhrases = new Set<string>();
  
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      foundPhrases.add(match[0]);
    }
  }

  // Parse each unique phrase
  for (const phrase of foundPhrases) {
    const parsed = parseDate(phrase, reference);
    if (parsed && !results.some(r => r.iso === parsed.iso)) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Format parsed date for display
 */
export function formatParsedDate(parsed: ParsedDate): string {
  const date = new Date(parsed.iso);
  const now = new Date();
  
  // If today, show time
  if (isSameDay(date, now)) {
    return `Today at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // If this week, show day name
  const daysAway = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAway >= 0 && daysAway < 7) {
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${dayName} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Otherwise, show full date
  return date.toLocaleDateString('en-GB', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}
