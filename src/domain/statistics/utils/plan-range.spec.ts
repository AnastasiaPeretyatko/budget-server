import { PlanRange } from '../dto/plan-range.enum';
import { CycleBounds } from '../../billing_period/utils/cycle-bounds';
import {
  getWindowEnd,
  PlanWindow,
  selectWindows,
  subtractMonths,
} from './plan-range';

const bounds = (
  startDate: string,
  endDate: string | null = null,
): CycleBounds => ({ startDate, endDate, daysTotal: null, daysLeft: null });

const window = (
  id: string,
  from: string,
  to: string,
  isActive = false,
): PlanWindow => ({
  id,
  isActive,
  from,
  to,
  plan: null,
  bounds: bounds(from, to),
});

describe('subtractMonths', () => {
  it('вычитает месяцы в пределах года', () => {
    expect(subtractMonths('2026-10-07', 6)).toBe('2026-04-07');
  });

  it('переходит через границу года', () => {
    expect(subtractMonths('2026-03-15', 6)).toBe('2025-09-15');
    expect(subtractMonths('2026-10-07', 12)).toBe('2025-10-07');
  });

  it('если нужного числа нет в месяце — берёт последний день', () => {
    expect(subtractMonths('2026-08-31', 6)).toBe('2026-02-28');
    expect(subtractMonths('2024-08-31', 6)).toBe('2024-02-29');
  });

  it('вычитание 12 месяцев в январе даёт январь прошлого года', () => {
    expect(subtractMonths('2026-01-10', 12)).toBe('2025-01-10');
  });
});

describe('getWindowEnd', () => {
  it('без конца цикла — сегодня', () => {
    expect(getWindowEnd(bounds('2026-10-01'), true, '2026-10-07')).toBe(
      '2026-10-07',
    );
  });

  it('активный цикл ещё идёт — до сегодня', () => {
    expect(
      getWindowEnd(bounds('2026-10-01', '2026-10-28'), true, '2026-10-07'),
    ).toBe('2026-10-07');
  });

  it('активный цикл уже закончился по дате — до его конца', () => {
    expect(
      getWindowEnd(bounds('2026-09-01', '2026-09-28'), true, '2026-10-07'),
    ).toBe('2026-09-28');
  });

  it('закрытый цикл — весь цикл', () => {
    expect(
      getWindowEnd(bounds('2026-10-01', '2026-10-28'), false, '2026-10-07'),
    ).toBe('2026-10-28');
  });
});

describe('selectWindows', () => {
  const today = '2026-10-07';
  const windows = [
    window('active', '2026-10-01', '2026-10-07', true),
    window('old', '2025-01-01', '2025-01-28'),
    window('mid', '2026-03-01', '2026-03-28'),
    window('edge', '2026-04-01', '2026-04-28'),
    window('year', '2025-10-01', '2025-10-28'),
  ];

  it('all — все циклы по возрастанию даты', () => {
    expect(
      selectWindows(windows, PlanRange.ALL, today).map((w) => w.id),
    ).toEqual(['old', 'year', 'mid', 'edge', 'active']);
  });

  it('cycle — только активный', () => {
    expect(
      selectWindows(windows, PlanRange.CYCLE, today).map((w) => w.id),
    ).toEqual(['active']);
  });

  it('cycle без активного цикла — пусто', () => {
    expect(
      selectWindows(
        [window('a', '2026-01-01', '2026-01-28')],
        PlanRange.CYCLE,
        today,
      ),
    ).toEqual([]);
  });

  it('half_year — циклы, закончившиеся не раньше даты «6 месяцев назад»', () => {
    // граница 2026-04-07: цикл апреля заканчивается 28-го — входит, марта — нет
    expect(
      selectWindows(windows, PlanRange.HALF_YEAR, today).map((w) => w.id),
    ).toEqual(['edge', 'active']);
  });

  it('year — циклы, закончившиеся не раньше даты «год назад»', () => {
    // граница 2025-10-07: цикл октября 2025 заканчивается 28-го — входит
    expect(
      selectWindows(windows, PlanRange.YEAR, today).map((w) => w.id),
    ).toEqual(['year', 'mid', 'edge', 'active']);
  });

  it('не меняет исходный массив', () => {
    const copy = [...windows];
    selectWindows(windows, PlanRange.ALL, today);
    expect(windows).toEqual(copy);
  });
});
