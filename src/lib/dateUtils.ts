/**
 * Shamsi (Jalali) & Persian Date Utilities for Hekmat Akma Management System
 */

// Format any date/timestamp/ISO string into beautiful Shamsi (Jalali) format
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

    // Default numeric: YYYY/MM/DD or YYYY/MM/DD - HH:mm
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

// Convert Persian numbers to English numbers
export function toLatinDigits(str: string): string {
  const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/[۰-۹]/g, (w) => String(faDigits.indexOf(w))).replace(/[٠-٩]/g, (w) => String(arDigits.indexOf(w)));
}

// Convert English numbers to Persian numbers
export function toPersianDigits(n: string | number): string {
  if (n === null || n === undefined) return "";
  const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/\d/g, (x) => faDigits[Number(x)]);
}

// Format Money in Toman / Rial with Persian formatting
export function formatMoney(amount: number | string | null | undefined, unit: string = "تومان"): string {
  const num = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat("fa-IR").format(num);
  return unit ? `${formatted} ${unit}` : formatted;
}

// Format simple number with Persian comma separator
export function formatNumber(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("fa-IR").format(num);
}

// Get current Shamsi date as string YYYY/MM/DD in English digits for inputs
export function getCurrentJalaliDate(): string {
  const now = new Date();
  const y = toLatinDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(now));
  const m = toLatinDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "2-digit" }).format(now));
  const d = toLatinDigits(new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "2-digit" }).format(now));
  return `${y}/${m}/${d}`;
}
