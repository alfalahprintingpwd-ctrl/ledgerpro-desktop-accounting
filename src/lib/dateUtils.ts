import { useState, useEffect } from 'react';

/**
 * Centralized Date & Time Service for Accounting System
 * Automatically detects and utilizes the computer/device's local timezone.
 * Works 100% offline without external IP or API calls.
 */

/**
 * Dynamically detects the local operating system / browser timezone.
 * Example: 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York'
 */
export function getSystemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Alias for getSystemTimeZone for convenience
 */
export function getUserTimeZone(): string {
  return getSystemTimeZone();
}

/**
 * Returns local accounting date string in "YYYY-MM-DD" format for the computer's local timezone.
 * Avoids UTC ISO string shifts which cause offset errors.
 */
export function getLocalAccountingDate(dateInput: Date = new Date()): string {
  try {
    const timeZone = getSystemTimeZone();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(dateInput);
  } catch {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Returns a Date object for local date/time operations.
 */
export function getLocalDateTime(dateInput: Date = new Date()): Date {
  return dateInput;
}

/**
 * Returns "YYYY-MM" for the computer's local timezone
 */
export function getLocalAccountingMonthId(dateInput: Date = new Date()): string {
  return getLocalAccountingDate(dateInput).slice(0, 7);
}

/**
 * Returns numeric local year for the computer's local timezone
 */
export function getLocalAccountingYear(dateInput: Date = new Date()): number {
  const dateStr = getLocalAccountingDate(dateInput);
  return parseInt(dateStr.slice(0, 4), 10) || new Date().getFullYear();
}

/**
 * Returns numeric local month (1-12) for the computer's local timezone
 */
export function getLocalAccountingMonthNumber(dateInput: Date = new Date()): number {
  const dateStr = getLocalAccountingDate(dateInput);
  return parseInt(dateStr.slice(5, 7), 10) || (new Date().getMonth() + 1);
}

/**
 * Parse YYYY-MM-DD into numeric parts safely without UTC offset shift
 */
export function parseLocalDate(dateString: string): { year: number; month: number; day: number } | null {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Derives the correct day of the week (e.g., "Monday", "Tuesday") for a given date in the computer's local timezone
 */
export function getDayOfWeek(dateInput: string | Date = getLocalAccountingDate()): string {
  if (!dateInput) return '';
  let date: Date;

  if (typeof dateInput === 'string') {
    const parsed = parseLocalDate(dateInput);
    if (parsed) {
      date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: getSystemTimeZone(),
    }).format(date);
  } catch {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getUTCDay()] || '';
  }
}

/**
 * Alias for getDayOfWeek for backwards compatibility.
 * Automatically updates Day when Date changes.
 */
export function getDayName(dateString: string): string {
  return getDayOfWeek(dateString);
}

/**
 * Formats a date string (YYYY-MM-DD) or Date object to 'DD Month YYYY' format (e.g., "10 August 2026")
 */
export function formatDateToDDMonthYYYY(dateInput: string | Date = getLocalAccountingDate()): string {
  if (!dateInput) return '';

  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string') {
    const parsed = parseLocalDate(dateInput);
    if (parsed) {
      year = parsed.year;
      month = parsed.month;
      day = parsed.day;
    } else {
      const dateObj = new Date(dateInput);
      if (isNaN(dateObj.getTime())) return dateInput;
      year = dateObj.getFullYear();
      month = dateObj.getMonth() + 1;
      day = dateObj.getDate();
    }
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth() + 1;
    day = dateInput.getDate();
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[month - 1] || '';
  const dayStr = String(day).padStart(2, '0');

  return `${dayStr} ${monthName} ${year}`;
}

/**
 * Format YYYY-MM-DD date string as "10-Aug-2026"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const parsed = parseLocalDate(dateString);
  if (!parsed) return dateString;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayStr = String(parsed.day).padStart(2, '0');
  const monthStr = monthNames[parsed.month - 1] || '';
  return `${dayStr}-${monthStr}-${parsed.year}`;
}

/**
 * Format timestamp or Date object into local date and time in computer's local timezone (e.g., "10-Aug-2026 03:45 PM")
 */
export function formatDateTimeLocal(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);
  try {
    const timeZone = getSystemTimeZone();
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Alias for formatDateTimeLocal for backwards compatibility across existing components.
 */
export function formatDateTimePKT(dateInput?: string | Date): string {
  return formatDateTimeLocal(dateInput);
}

/**
 * Shift a YYYY-MM-DD local date string by a given number of days (+/-)
 */
export function addDaysToLocalDate(dateString: string, days: number): string {
  const parsed = parseLocalDate(dateString);
  if (!parsed) return getLocalAccountingDate();

  const utcDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days, 12, 0, 0));
  return getLocalAccountingDate(utcDate);
}

/**
 * React Hook to monitor local date changes (e.g., crossing midnight or computer timezone change).
 * Automatically updates component state when midnight strikes or system timezone changes.
 */
export function useLocalDateWatcher(): { currentDate: string; timeZone: string } {
  const [dateState, setDateState] = useState(() => ({
    currentDate: getLocalAccountingDate(),
    timeZone: getSystemTimeZone(),
  }));

  useEffect(() => {
    const checkDate = () => {
      const freshDate = getLocalAccountingDate();
      const freshTz = getSystemTimeZone();
      setDateState((prev) => {
        if (prev.currentDate !== freshDate || prev.timeZone !== freshTz) {
          return { currentDate: freshDate, timeZone: freshTz };
        }
        return prev;
      });
    };

    // Check periodically every 15 seconds
    const interval = setInterval(checkDate, 15000);

    // Also check on window focus / visibility change
    const handleFocus = () => checkDate();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  return dateState;
}
