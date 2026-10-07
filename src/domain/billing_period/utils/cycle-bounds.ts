export interface CyclePeriod {
  startDate: string | null;
  endDate: string | null;
  startDay: number | null;
}

export interface CycleBounds {
  startDate: string;
  endDate: string | null;
  daysTotal: number | null;
  daysLeft: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

const parseDate = (value: string): number => {
  const [y, m, d] = value.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const formatUtc = (ms: number): string => {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

// Дата как «YYYY-MM-DD» по локальному календарю сервера (не через toISOString,
// который переводит в UTC и может сдвинуть день)
export const formatLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Число месяца startDay в заданном месяце. Если такого дня нет
// (например 31 в сентябре) — последний день месяца
const occurrence = (year: number, month: number, startDay: number): number => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(startDay, daysInMonth));
};

const daysBetweenInclusive = (from: number, to: number): number =>
  Math.round((to - from) / MS_PER_DAY) + 1;

const build = (
  startMs: number,
  endMs: number | null,
  todayMs: number,
): CycleBounds => ({
  startDate: formatUtc(startMs),
  endDate: endMs === null ? null : formatUtc(endMs),
  daysTotal:
    endMs === null ? null : Math.max(0, daysBetweenInclusive(startMs, endMs)),
  daysLeft:
    endMs === null ? null : Math.max(0, daysBetweenInclusive(todayMs, endMs)),
});

// Границы текущего цикла по активному периоду. null — начало определить нельзя.
export function calculateCycleBounds(
  period: CyclePeriod,
  today: Date,
): CycleBounds | null {
  const todayMs = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // Фиксированный период: даты берём как есть
  if (period.startDate && period.endDate) {
    return build(
      parseDate(period.startDate),
      parseDate(period.endDate),
      todayMs,
    );
  }

  // Период по числу месяца (например, день зарплаты)
  if (period.startDay && period.startDay >= 1) {
    const year = today.getFullYear();
    const month = today.getMonth();

    const thisMonthStart = occurrence(year, month, period.startDay);
    const startMs =
      todayMs >= thisMonthStart
        ? thisMonthStart
        : occurrence(year, month - 1, period.startDay);

    const start = new Date(startMs);
    const nextStart = occurrence(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      period.startDay,
    );

    return build(startMs, nextStart - MS_PER_DAY, todayMs);
  }

  // Есть только начало — конец неизвестен
  if (period.startDate) {
    return build(parseDate(period.startDate), null, todayMs);
  }

  return null;
}
