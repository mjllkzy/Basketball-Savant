type DateParts = {
  year: number;
  month: number;
  day: number;
};

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})/;

function datePartsFromDate(date: Date): DateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function parseDateParts(value: Date | string | null | undefined): DateParts | null {
  if (!value) return null;
  if (value instanceof Date) return datePartsFromDate(value);

  const match = value.match(isoDatePattern);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function birthdayInYear(birthDate: DateParts, year: number): DateParts {
  if (birthDate.month === 2 && birthDate.day === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: birthDate.month, day: birthDate.day };
}

function compareDateParts(left: DateParts, right: DateParts) {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

function utcDayNumber(date: DateParts) {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}

function daysBetween(start: DateParts, end: DateParts) {
  return utcDayNumber(end) - utcDayNumber(start);
}

export function normalizeBirthDate(value: Date | string | null | undefined): string | null {
  const birthDate = parseDateParts(value);
  return birthDate
    ? `${birthDate.year}-${String(birthDate.month).padStart(2, "0")}-${String(birthDate.day).padStart(2, "0")}`
    : null;
}

export function decimalAgeFromBirthDate(value: Date | string | null | undefined, asOf = new Date()): number | null {
  const birthDate = parseDateParts(value);
  if (!birthDate) return null;

  const today = datePartsFromDate(asOf);
  if (compareDateParts(today, birthDate) < 0) return null;

  const birthdayThisYear = birthdayInYear(birthDate, today.year);
  const hasHadBirthdayThisYear = compareDateParts(today, birthdayThisYear) >= 0;
  const completedYears = today.year - birthDate.year - (hasHadBirthdayThisYear ? 0 : 1);
  const lastBirthday = birthdayInYear(birthDate, hasHadBirthdayThisYear ? today.year : today.year - 1);
  const nextBirthday = birthdayInYear(birthDate, lastBirthday.year + 1);
  const birthdaySpanDays = Math.max(daysBetween(lastBirthday, nextBirthday), 1);
  const elapsedDays = Math.max(daysBetween(lastBirthday, today), 0);

  return completedYears + elapsedDays / birthdaySpanDays;
}

export function displayAgeFromBirthDate(value: Date | string | null | undefined, fallback?: number | null) {
  const age = decimalAgeFromBirthDate(value);
  if (age !== null) return age.toFixed(1);
  return fallback === null || fallback === undefined || !Number.isFinite(fallback) ? "N/A" : fallback.toFixed(1);
}
