/**
 * Date utility enforcing SAP enterprise standard:
 * User-facing display: DD/MM/YYYY
 * Internal storage: ISO YYYY-MM-DD or ISO 8601 string
 */

export function formatDateDisplay(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      // If it's already in DD/MM/YYYY
      if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
        return dateInput;
      }
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput || '-');
  }
}

export function formatDateTimeDisplay(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateInput || '-');
  }
}

/**
 * Converts user input DD/MM/YYYY or YYYY-MM-DD to standard ISO YYYY-MM-DD for database storage
 */
export function toIsoDate(input: string): string {
  if (!input) return new Date().toISOString().split('T')[0];
  const trimmed = input.trim();
  // Check DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculates process aging in elapsed days
 */
export function calculateAgingDays(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns aging bucket category: 0-3 Days, 4-7 Days, 8-15 Days, 16-30 Days, 31+ Days
 */
export function getAgingBucket(days: number): '0-3 Days' | '4-7 Days' | '8-15 Days' | '16-30 Days' | '31+ Days' {
  if (days <= 3) return '0-3 Days';
  if (days <= 7) return '4-7 Days';
  if (days <= 15) return '8-15 Days';
  if (days <= 30) return '16-30 Days';
  return '31+ Days';
}
