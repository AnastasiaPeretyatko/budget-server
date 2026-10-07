import { CycleBounds } from '../../billing_period/utils/cycle-bounds';
import { Plan } from '../../billing_period/utils/period-plan';
import { PlanRange } from '../dto/plan-range.enum';

// Цикл, по которому считается страница «План»: окно дат расходов и план цикла
export interface PlanWindow {
  id: string;
  isActive: boolean;
  // Окно расходов, включительно: «YYYY-MM-DD»
  from: string;
  to: string;
  // null — плана нет (цикл закрыт до появления снимка лимитов)
  plan: Plan | null;
  // Полные границы цикла, для графика по дням активного цикла
  bounds: CycleBounds;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Дата на N месяцев назад. Если такого числа в месяце нет
// (31 марта минус месяц) — последний день месяца
export function subtractMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const total = year * 12 + (month - 1) - months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = total % 12;
  const daysInMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return `${targetYear}-${pad(targetMonth + 1)}-${pad(Math.min(day, daysInMonth))}`;
}

// Расходы активного цикла считаем до сегодня (но не дальше конца цикла),
// завершённого — весь цикл. Так же, как в итогах цикла.
export function getWindowEnd(
  bounds: CycleBounds,
  isActive: boolean,
  today: string,
): string {
  if (bounds.endDate === null) return today;
  return isActive && bounds.endDate > today ? today : bounds.endDate;
}

// Какие циклы входят в выбранный диапазон. Результат — по возрастанию даты.
export function selectWindows(
  windows: PlanWindow[],
  range: PlanRange,
  today: string,
): PlanWindow[] {
  const sorted = [...windows].sort((a, b) => a.from.localeCompare(b.from));

  switch (range) {
    case PlanRange.CYCLE: {
      const active = sorted.filter((window) => window.isActive);
      return active.slice(-1);
    }
    case PlanRange.HALF_YEAR: {
      const cutoff = subtractMonths(today, 6);
      return sorted.filter((window) => window.to >= cutoff);
    }
    case PlanRange.YEAR: {
      const cutoff = subtractMonths(today, 12);
      return sorted.filter((window) => window.to >= cutoff);
    }
    case PlanRange.ALL:
    default:
      return sorted;
  }
}
