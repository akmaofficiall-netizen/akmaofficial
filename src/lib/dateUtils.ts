/**
 * Shamsi (Jalali) & Persian Date Utilities for Hekmat Akma Management System
 *
 * Core principle: Database = Gregorian/UTC-safe, UI = Jalali
 * All conversions go through this centralized module.
 */

// ─── Persian/Arabic digit conversion ───────────────────────────────────────

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toLatinDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (w) => String(FA_DIGITS.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(AR_DIGITS.indexOf(w)));
}

export function toPersianDigits(n: string | number): string {
  if (n === null || n === undefined) return "";
  return String(n).replace(/\d/g, (x) => FA_DIGITS[Number(x)]);
}

// ─── Jalali ↔ Gregorian Conversion ─────────────────────────────────────────

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

const JALALI_MONTHS = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

function isJalaliLeapYear(year: number): boolean {
  return [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69].includes(year % 33);
}

function jalaliDayOfYear(year: number, month: number, day: number): number {
  let doy = day;
  for (let i = 1; i < month; i++) {
    doy += JALALI_MONTHS[i];
  }
  if (month > 6 && isJalaliLeapYear(year)) doy++;
  return doy;
}

/**
 * Convert Gregorian Date to Jalali
 */
export function gregorianToJalali(date: Date | string | number): JalaliDate {
  const d = new Date(date);
  if (isNaN(d.getTime())) return { year: 0, month: 0, day: 0 };

  // Adjust for Iran timezone (UTC+3:30)
  const local = new Date(d.getTime() + (3.5 * 60 * 60 * 1000));

  const gy = local.getUTCFullYear();
  const gm = local.getUTCMonth() + 1;
  const gd = local.getUTCDate();

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gy;
  if (gm > 2) gy2++;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { year: jy, month: jm, day: jd };
}

/**
 * Convert Jalali Date to Gregorian
 */
export function jalaliToGregorian(jalali: JalaliDate): Date {
  const { year: jy, month: jm, day: jd } = jalali;

  let jy2 = jy + 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const salA = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const l = salA[gm];
    if (gd <= l) break;
    gd -= l;
  }

  // Convert to UTC by subtracting Iran timezone offset
  return new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0) - 3.5 * 60 * 60 * 1000);
}

/**
 * Parse a Jalali string "1403/05/15" or "1403-05-15" to Gregorian Date
 */
export function parseJalaliString(str: string): Date | null {
  if (!str) return null;
  const parts = str.split(/[\/\-]/).map((s) => parseInt(toLatinDigits(s.trim()), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return jalaliToGregorian({ year, month, day });
}

/**
 * Format Jalali date to string "YYYY/MM/DD" in Latin digits
 */
export function jalaliToString(jalali: JalaliDate): string {
  return `${jalali.year}/${String(jalali.month).padStart(2, "0")}/${String(jalali.day).padStart(2, "0")}`;
}

// ─── Date Display Formatting ───────────────────────────────────────────────

export function toJalaliDate(
  dateInput: string | Date | number | null | undefined,
  options: {
    showTime?: boolean;
    format?: "numeric" | "words" | "short";
    persianDigits?: boolean;
  } = {}
): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "—";

    const { showTime = false, format = "numeric", persianDigits = true } = options;

    if (format === "words") {
      const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...(showTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      });
      return formatter.format(d);
    }

    if (format === "short") {
      const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        month: "short",
        day: "numeric",
      });
      return formatter.format(d);
    }

    const yearFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" });
    const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "2-digit" });
    const dayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "2-digit" });

    const y = yearFormatter.format(d);
    const m = monthFormatter.format(d);
    const day = dayFormatter.format(d);

    let res = `${y}/${m}/${day}`;

    if (showTime) {
      const timeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        hour: "2-digit",
        minute: "2-digit",
      });
      res += ` - ${timeFormatter.format(d)}`;
    }

    if (!persianDigits) {
      res = toLatinDigits(res);
    }

    return res;
  } catch {
    return String(dateInput);
  }
}

// ─── Date Range Helpers (for report filtering) ─────────────────────────────

/**
 * Get start of day in Tehran timezone (UTC+3:30)
 */
export function getStartOfDayJalali(date?: Date | string | number): Date {
  const d = date ? new Date(date) : new Date();
  const result = new Date(d);
  result.setUTCHours(0, 0, 0, 0);
  // Subtract Iran timezone offset to get UTC start of Tehran day
  result.setTime(result.getTime() - 3.5 * 60 * 60 * 1000);
  return result;
}

/**
 * Get end of day in Tehran timezone (UTC+3:30)
 */
export function getEndOfDayJalali(date?: Date | string | number): Date {
  const d = date ? new Date(date) : new Date();
  const result = new Date(d);
  result.setUTCHours(23, 59, 59, 999);
  result.setTime(result.getTime() - 3.5 * 60 * 60 * 1000);
  return result;
}

/**
 * Get start of Jalali month
 */
export function getStartOfJalaliMonth(jalali: JalaliDate): Date {
  return jalaliToGregorian({ year: jalali.year, month: jalali.month, day: 1 });
}

/**
 * Get end of Jalali month
 */
export function getEndOfJalaliMonth(jalali: JalaliDate): Date {
  const maxDay = JALALI_MONTHS[jalali.month] || 30;
  const leapExtra = jalali.month > 6 && isJalaliLeapYear(jalali.year) ? 1 : 0;
  const day = Math.min(jalali.day, maxDay + leapExtra);
  const d = jalaliToGregorian({ year: jalali.year, month: jalali.month, day });
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Format a Date range for display in Jalali
 */
export function formatDateRangeJalali(start?: Date | null, end?: Date | null): string {
  const s = start ? toJalaliDate(start, { persianDigits: false }) : "—";
  const e = end ? toJalaliDate(end, { persianDigits: false }) : "—";
  return `${s} تا ${e}`;
}

// ─── Quick Date Presets (Jalali-aware) ─────────────────────────────────────

function nowJalali(): JalaliDate {
  return gregorianToJalali(new Date());
}

export function getJalaliPresetRange(preset: string): { start: Date; end: Date } | null {
  const now = nowJalali();
  const today = new Date();

  switch (preset) {
    case "today": {
      return {
        start: getStartOfDayJalali(today),
        end: getEndOfDayJalali(today),
      };
    }
    case "this_week": {
      const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      return {
        start: getStartOfDayJalali(startOfWeek),
        end: getEndOfDayJalali(today),
      };
    }
    case "this_month": {
      return {
        start: jalaliToGregorian({ year: now.year, month: now.month, day: 1 }),
        end: getEndOfDayJalali(today),
      };
    }
    case "this_quarter": {
      const quarterMonth = Math.ceil(now.month / 3) * 3 - 2;
      return {
        start: jalaliToGregorian({ year: now.year, month: quarterMonth, day: 1 }),
        end: getEndOfDayJalali(today),
      };
    }
    case "this_year": {
      return {
        start: jalaliToGregorian({ year: now.year, month: 1, day: 1 }),
        end: getEndOfDayJalali(today),
      };
    }
    case "last_month": {
      const lastMonth = now.month === 1 ? 12 : now.month - 1;
      const lastMonthYear = now.month === 1 ? now.year - 1 : now.year;
      const lastMonthDays = JALALI_MONTHS[lastMonth] || 30;
      return {
        start: jalaliToGregorian({ year: lastMonthYear, month: lastMonth, day: 1 }),
        end: jalaliToGregorian({ year: lastMonthYear, month: lastMonth, day: lastMonthDays }),
      };
    }
    default:
      return null;
  }
}

// ─── Money Formatting ──────────────────────────────────────────────────────

export function formatMoney(amount: number | string | null | undefined, unit: string = "تومان"): string {
  const num = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat("fa-IR").format(num);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatMoneyDual(amountInToman: number | string | null | undefined): string {
  const toman = Math.round(Number(amountInToman) || 0);
  const rial = toman * 10;
  const tomanStr = new Intl.NumberFormat("fa-IR").format(toman);
  const rialStr = new Intl.NumberFormat("fa-IR").format(rial);
  return `${tomanStr} تومان (${rialStr} ریال)`;
}

export function formatRial(amountInToman: number | string | null | undefined): string {
  const rial = Math.round(Number(amountInToman) || 0) * 10;
  return `${new Intl.NumberFormat("fa-IR").format(rial)} ریال`;
}

export function formatNumber(amount: number | string | null | undefined, maxDecimals: number = 4): string {
  if (amount === null || amount === undefined || amount === "") return "۰";
  const num = Number(amount);
  if (isNaN(num)) return "۰";
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

export function formatQuantity(
  amount: number | string | null | undefined,
  unit?: string | null,
  maxDecimals: number = 4
): string {
  const formatted = formatNumber(amount, maxDecimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function getCurrentJalaliDate(): string {
  const now = new Date();
  const jalali = gregorianToJalali(now);
  return jalaliToString(jalali);
}

// ─── Validation Helpers ────────────────────────────────────────────────────

export function isValidJalaliDate(str: string): boolean {
  if (!str) return false;
  const parts = str.split(/[\/\-]/).map((s) => parseInt(toLatinDigits(s.trim()), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [year, month, day] = parts;
  if (year < 1000 || year > 1600) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

export function isValidGregorianDate(date: Date | string | number): boolean {
  const d = new Date(date);
  return !isNaN(d.getTime());
}
