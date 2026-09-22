/**
 * Thai Date & Time formatting utilities for Silpakorn University Committee App
 * Converts various date representations (ISO, Google Sheet Date string, Thai locale string)
 * into standard Thai Buddhist Era (พ.ศ.) date-time format.
 */

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export interface ParsedThaiDate {
  day: number;
  month: number; // 0-11
  year: number; // พ.ศ. (e.g., 2569)
  hour: number;
  min: number;
  sec: number;
  isAdminEdit: boolean;
}

/**
 * Parses any incoming date string (English Date.toString(), Thai locale, ISO, etc.)
 * into Thai date components in Bangkok timezone (GMT+7) and Buddhist Era year.
 */
export function parseToThaiDateParts(raw: unknown): ParsedThaiDate | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  const isAdminEdit = str.includes('(แก้ไขโดย Admin)');
  const cleanStr = str.replace(/\s*\(แก้ไขโดย Admin\)/g, '').trim();

  // Pattern 1: Google Apps Script / JS Date.toString()
  // Example: "Fri Sep 22 2569 18:32:02 GMT+0700 (Indochina Time)"
  const engDateMatch = cleanStr.match(
    /([A-Za-z]{3})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?/
  );
  if (engDateMatch) {
    const monthsMap: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = monthsMap[engDateMatch[2]] ?? 0;
    const day = parseInt(engDateMatch[3], 10);
    let year = parseInt(engDateMatch[4], 10);
    const hour = parseInt(engDateMatch[5], 10);
    const min = parseInt(engDateMatch[6], 10);
    const sec = engDateMatch[7] ? parseInt(engDateMatch[7], 10) : 0;

    // Google Sheets UTC timezone shift: when written to a sheet with UTC timezone,
    // Google Apps Script running in GMT+7 adds +7 hours to the cell value,
    // which incorrectly shifts daytime Thailand submissions (e.g. 11:32 AM) into evening (e.g. 18:32 PM).
    // When "GMT+0700" or "Indochina Time" is present in this string, we adjust by -7 hours to restore real Thai time.
    if (cleanStr.includes('GMT+0700') || cleanStr.includes('Indochina Time')) {
      const d = new Date(year < 2400 ? year : year - 543, month, day, hour, min, sec);
      d.setHours(d.getHours() - 7);
      const adjYear = d.getFullYear() + (year >= 2400 ? 543 : 0);
      return {
        day: d.getDate(),
        month: d.getMonth(),
        year: adjYear < 2400 ? adjYear + 543 : adjYear,
        hour: d.getHours(),
        min: d.getMinutes(),
        sec: d.getSeconds(),
        isAdminEdit,
      };
    }

    if (year < 2400) year += 543;
    return { day, month, year, hour, min, sec, isAdminEdit };
  }

  // Pattern 2: Thai slash string "22/9/2569 11:33:57" or "22/09/2569, 11:33:57"
  const slashMatch = cleanStr.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = parseInt(slashMatch[3], 10);
    if (year < 2400) year += 543;
    const hour = parseInt(slashMatch[4], 10);
    const min = parseInt(slashMatch[5], 10);
    const sec = slashMatch[6] ? parseInt(slashMatch[6], 10) : 0;
    return { day, month, year, hour, min, sec, isAdminEdit };
  }

  // Pattern 3: Standard ISO or browser-parseable Date
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    try {
      const bkkFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const parts = bkkFormatter.formatToParts(d);
      let day = 1,
        month = 0,
        year = 2026,
        hour = 0,
        min = 0,
        sec = 0;
      for (const part of parts) {
        if (part.type === 'day') day = parseInt(part.value, 10);
        if (part.type === 'month') month = parseInt(part.value, 10) - 1;
        if (part.type === 'year') year = parseInt(part.value, 10);
        if (part.type === 'hour') hour = parseInt(part.value, 10);
        if (part.type === 'minute') min = parseInt(part.value, 10);
        if (part.type === 'second') sec = parseInt(part.value, 10);
      }
      if (year < 2400) year += 543;
      return { day, month, year, hour, min, sec, isAdminEdit };
    } catch {
      // fallback
    }
  }

  return null;
}

/**
 * Formats a timestamp into Thai date and time:
 * Example: "22 ก.ย. 2569 เวลา 18:32:02 น."
 */
export function formatThaiDateTime(raw: unknown): string {
  if (!raw) return '-';
  const parsed = parseToThaiDateParts(raw);
  if (!parsed) return String(raw);

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthName = THAI_MONTHS_SHORT[parsed.month] || '';
  const timeFormatted = `${pad(parsed.hour)}:${pad(parsed.min)}:${pad(parsed.sec)} น.`;
  const result = `${parsed.day} ${monthName} ${parsed.year} เวลา ${timeFormatted}`;

  return parsed.isAdminEdit ? `${result} (แก้ไขโดย Admin)` : result;
}

/**
 * Formats into compact time only (e.g., "18:32 น." or "18:32:02 น.") for compact lists.
 */
export function formatThaiTime(raw: unknown, includeSeconds = false): string {
  if (!raw) return '-';
  const parsed = parseToThaiDateParts(raw);
  if (!parsed) return String(raw);

  const pad = (n: number) => String(n).padStart(2, '0');
  if (includeSeconds) {
    return `${pad(parsed.hour)}:${pad(parsed.min)}:${pad(parsed.sec)} น.`;
  }
  return `${pad(parsed.hour)}:${pad(parsed.min)} น.`;
}

/**
 * Formats into Thai Date only (without time).
 * Example: "22 กันยายน 2569"
 */
export function formatThaiDateOnly(raw: unknown, fullMonth = false): string {
  if (!raw) return '-';
  const parsed = parseToThaiDateParts(raw);
  if (!parsed) return String(raw);

  const monthName = fullMonth
    ? THAI_MONTHS_FULL[parsed.month] || ''
    : THAI_MONTHS_SHORT[parsed.month] || '';

  return `${parsed.day} ${monthName} ${parsed.year}`;
}

/**
 * Returns current timestamp in formatted Thai string.
 */
export function getCurrentThaiTimestamp(): string {
  return formatThaiDateTime(new Date().toISOString());
}
