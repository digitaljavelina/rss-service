/**
 * Date Parser Service
 * Parses natural language date strings using chrono-node
 */

import * as chrono from 'chrono-node';

/**
 * Parse a date string into a Date object
 * @param dateText - The date string to parse (e.g., "2 hours ago", "January 15, 2024")
 * @param referenceDate - Optional reference date for relative parsing
 * @returns Parsed Date object, or current date if parsing fails
 */
export function parseDate(
  dateText: string | undefined,
  referenceDate?: Date
): Date {
  if (!dateText) {
    return new Date();
  }

  const parsed = chrono.parseDate(dateText, referenceDate || new Date());

  if (!parsed) {
    return new Date();
  }

  return parsed;
}
