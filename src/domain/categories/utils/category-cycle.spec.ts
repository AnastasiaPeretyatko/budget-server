import { CycleBounds } from '../../billing_period/utils/cycle-bounds';
import { buildCategoryCycle } from './category-cycle';

const bounds: CycleBounds = {
  startDate: '2026-09-06',
  endDate: '2026-10-03',
  daysTotal: 28,
  daysLeft: 12,
};

describe('buildCategoryCycle', () => {
  it('лимит не превышен: ok', () => {
    expect(
      buildCategoryCycle(bounds, '45000.00', { total: '28450.00', count: 21 }),
    ).toEqual({
      ...bounds,
      spent: '28450.00',
      remaining: '16550.00',
      percent: 63,
      transactionCount: 21,
      status: 'ok',
    });
  });

  it('лимит превышен: exceeded, остаток отрицательный, процент больше 100', () => {
    expect(
      buildCategoryCycle(bounds, '1000.00', { total: '1500.00', count: 3 }),
    ).toMatchObject({
      spent: '1500.00',
      remaining: '-500.00',
      percent: 150,
      status: 'exceeded',
    });
  });

  it('нет лимита (null): no_limit, remaining и percent = null', () => {
    expect(
      buildCategoryCycle(bounds, null, { total: '300.00', count: 2 }),
    ).toMatchObject({
      spent: '300.00',
      remaining: null,
      percent: null,
      transactionCount: 2,
      status: 'no_limit',
    });
  });

  it('лимит 0 считается как «лимита нет»', () => {
    expect(
      buildCategoryCycle(bounds, '0.00', { total: '300.00', count: 2 }),
    ).toMatchObject({ remaining: null, percent: null, status: 'no_limit' });
  });

  it('нет расходов: "0.00" и 0 транзакций', () => {
    expect(buildCategoryCycle(bounds, '1000.00', undefined)).toMatchObject({
      spent: '0.00',
      remaining: '1000.00',
      percent: 0,
      transactionCount: 0,
      status: 'ok',
    });
  });

  describe('границы статуса', () => {
    const statusFor = (spent: string) =>
      buildCategoryCycle(bounds, '100.00', { total: spent, count: 1 }).status;

    it('79% — ok', () => expect(statusFor('79.00')).toBe('ok'));
    it('80% — warning', () => expect(statusFor('80.00')).toBe('warning'));
    it('100% — warning', () => expect(statusFor('100.00')).toBe('warning'));
    it('101% — exceeded', () => expect(statusFor('101.00')).toBe('exceeded'));
  });

  it('копейки считаются без ошибок дробей', () => {
    // 0.1 + 0.2 в обычных дробях даёт 0.30000000000000004
    expect(
      buildCategoryCycle(bounds, '0.50', { total: '0.30', count: 1 }),
    ).toMatchObject({ spent: '0.30', remaining: '0.20', percent: 60 });
  });

  it('cycle-границы пробрасываются, в том числе null', () => {
    const open: CycleBounds = {
      startDate: '2026-09-06',
      endDate: null,
      daysTotal: null,
      daysLeft: null,
    };
    expect(buildCategoryCycle(open, null, undefined)).toMatchObject(open);
  });
});
