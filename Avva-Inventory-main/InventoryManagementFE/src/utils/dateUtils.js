/**
 * Utility functions for consistent Date and Time parsing and formatting across the application.
 */

/**
 * Parses a date input (string, Date object, or timestamp) safely into a Date object.
 * Normalizes UTC ISO strings missing timezone offset or 'Z' suffix so JavaScript
 * treats them as UTC rather than local browser time.
 */
export const parseDateTime = (dateInput) => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  if (typeof dateInput === 'string') {
    let dateStr = dateInput.trim();
    // If ISO string like "2026-08-08T07:39:19" or "2026-08-08 07:39:19" without Z or offset (+/-)
    if (dateStr.includes('T') || (dateStr.includes(' ') && dateStr.length >= 19)) {
      dateStr = dateStr.replace(' ', 'T');
      if (!dateStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
        dateStr += 'Z';
      }
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? new Date() : date;
};

/**
 * Formats a date string/object to standard format "DD/MM/YYYY" (e.g. 08/08/2026)
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = parseDateTime(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formats a date string/object to 12-hour time "hh:mm A" (e.g. 01:09 PM)
 */
export const formatTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = parseDateTime(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Formats a date string/object to "DD/MM/YYYY hh:mm A"
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = formatDate(dateInput);
  const t = formatTime(dateInput);
  if (d === 'N/A' || t === 'N/A') return 'N/A';
  return `${d} ${t}`;
};
