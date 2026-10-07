import { CycleBounds } from '../../billing_period/utils/cycle-bounds';
import { formatMoney, getPeriodRange } from './tag-stats';

const bounds = (startDate: string, endDate: string | null): CycleBounds => ({
  startDate,
  endDate,
  daysTotal: null,
  daysLeft: null,
});

describe('getPeriodRange', () => {
  it('активный период: до сегодня', () => {
    expect(
      getPeriodRange(bounds('2026-10-01', '2026-10-31'), '2026-10-06'),
    ).toEqual({ from: '2026-10-01', to: '2026-10-06' });
  });

  it('завершённый период: весь период', () => {
    expect(
      getPeriodRange(bounds('2026-08-01', '2026-08-31'), '2026-10-06'),
    ).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('последний день периода — сегодня: конец включительно', () => {
    expect(
      getPeriodRange(bounds('2026-10-01', '2026-10-06'), '2026-10-06'),
    ).toEqual({ from: '2026-10-01', to: '2026-10-06' });
  });

  it('конца нет: до сегодня', () => {
    expect(getPeriodRange(bounds('2026-09-15', null), '2026-10-06')).toEqual({
      from: '2026-09-15',
      to: '2026-10-06',
    });
  });
});

describe('formatMoney', () => {
  it.each([
    ['0', '0.00'],
    ['86400', '86400.00'],
    ['1500.5', '1500.50'],
    ['1500.00', '1500.00'],
    [undefined, '0.00'],
    [null, '0.00'],
  ])('%j → %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
});
