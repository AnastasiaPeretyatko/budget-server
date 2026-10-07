import { CycleBounds } from '../../billing_period/utils/cycle-bounds';
import { TagSort, TagWithStats } from '../types';

export interface PeriodRange {
  from: string;
  to: string;
}

// Диапазон дат для суммы расходов: от начала периода до min(конец, сегодня)
// включительно. Если конца нет — до сегодня. Даты — «YYYY-MM-DD», поэтому
// обычное сравнение строк работает как сравнение дат.
export function getPeriodRange(
  bounds: CycleBounds,
  today: string,
): PeriodRange {
  const to =
    bounds.endDate !== null && bounds.endDate < today ? bounds.endDate : today;

  return { from: bounds.startDate, to };
}

// Сумма из базы («0», «86400», «86400.5») — всегда строкой с двумя знаками
export const formatMoney = (value: string | null | undefined): string =>
  Number(value ?? 0).toFixed(2);

const byName = (a: TagWithStats, b: TagWithStats) =>
  a.name.localeCompare(b.name, 'ru');

export function sortTags(tags: TagWithStats[], sort: TagSort): TagWithStats[] {
  const sorted = [...tags];

  switch (sort) {
    case TagSort.NAME:
      return sorted.sort(byName);
    case TagSort.CREATED:
      // Сначала новые
      return sorted.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || byName(a, b),
      );
    case TagSort.USAGE:
    default:
      return sorted.sort(
        (a, b) => b.transactionCount - a.transactionCount || byName(a, b),
      );
  }
}
