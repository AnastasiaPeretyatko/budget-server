import { calculateCycleBounds } from './cycle-bounds';

// Месяцы в new Date считаются с нуля: 8 — сентябрь, 9 — октябрь
const date = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const noPeriod = { startDate: null, endDate: null, startDay: null };

describe('calculateCycleBounds', () => {
  describe('период с startDate и endDate', () => {
    const period = {
      ...noPeriod,
      startDate: '2026-09-06',
      endDate: '2026-10-03',
    };

    it('берёт даты как есть и считает дни', () => {
      expect(calculateCycleBounds(period, date(2026, 9, 22))).toEqual({
        startDate: '2026-09-06',
        endDate: '2026-10-03',
        daysTotal: 28,
        daysLeft: 12,
      });
    });

    it('в последний день цикла остаётся 1 день', () => {
      expect(calculateCycleBounds(period, date(2026, 10, 3))?.daysLeft).toBe(1);
    });

    it('после конца цикла daysLeft = 0, а не отрицательный', () => {
      expect(calculateCycleBounds(period, date(2026, 10, 20))?.daysLeft).toBe(
        0,
      );
    });

    it('startDate/endDate важнее startDay', () => {
      const bounds = calculateCycleBounds(
        { ...period, startDay: 15 },
        date(2026, 9, 22),
      );
      expect(bounds?.startDate).toBe('2026-09-06');
      expect(bounds?.endDate).toBe('2026-10-03');
    });
  });

  describe('период со startDay', () => {
    it('сегодня после startDay: цикл начался в этом месяце', () => {
      expect(
        calculateCycleBounds({ ...noPeriod, startDay: 6 }, date(2026, 9, 22)),
      ).toEqual({
        startDate: '2026-09-06',
        endDate: '2026-10-05',
        daysTotal: 30,
        daysLeft: 14,
      });
    });

    it('сегодня и есть startDay: цикл начинается сегодня', () => {
      const bounds = calculateCycleBounds(
        { ...noPeriod, startDay: 6 },
        date(2026, 9, 6),
      );
      expect(bounds?.startDate).toBe('2026-09-06');
      expect(bounds?.daysLeft).toBe(30);
    });

    it('сегодня до startDay: цикл начался в прошлом месяце', () => {
      const bounds = calculateCycleBounds(
        { ...noPeriod, startDay: 6 },
        date(2026, 9, 3),
      );
      expect(bounds?.startDate).toBe('2026-08-06');
      expect(bounds?.endDate).toBe('2026-09-05');
    });

    it('переход через Новый год', () => {
      const bounds = calculateCycleBounds(
        { ...noPeriod, startDay: 15 },
        date(2027, 1, 10),
      );
      expect(bounds?.startDate).toBe('2026-12-15');
      expect(bounds?.endDate).toBe('2027-01-14');
    });

    describe('startDay = 31 в коротком месяце', () => {
      const period = { ...noPeriod, startDay: 31 };

      it('6 октября: начало 30 сентября (в сентябре нет 31-го)', () => {
        expect(calculateCycleBounds(period, date(2026, 10, 6))).toEqual({
          startDate: '2026-09-30',
          endDate: '2026-10-30',
          daysTotal: 31,
          daysLeft: 25,
        });
      });

      it('31 октября: цикл начинается сегодня, конец 29 ноября', () => {
        const bounds = calculateCycleBounds(period, date(2026, 10, 31));
        expect(bounds?.startDate).toBe('2026-10-31');
        // в ноябре 30 дней, следующий старт 30 ноября
        expect(bounds?.endDate).toBe('2026-11-29');
      });

      it('февраль: следующий старт 28 февраля, конец 27 февраля', () => {
        const bounds = calculateCycleBounds(period, date(2027, 2, 10));
        expect(bounds?.startDate).toBe('2027-01-31');
        expect(bounds?.endDate).toBe('2027-02-27');
      });

      it('1 марта: начало 28 февраля', () => {
        const bounds = calculateCycleBounds(period, date(2027, 3, 1));
        expect(bounds?.startDate).toBe('2027-02-28');
        expect(bounds?.endDate).toBe('2027-03-30');
      });
    });
  });

  it('только startDate без endDate: конец неизвестен', () => {
    expect(
      calculateCycleBounds(
        { ...noPeriod, startDate: '2026-09-06' },
        date(2026, 9, 22),
      ),
    ).toEqual({
      startDate: '2026-09-06',
      endDate: null,
      daysTotal: null,
      daysLeft: null,
    });
  });

  it('нет ни startDate, ни startDay: null', () => {
    expect(calculateCycleBounds(noPeriod, date(2026, 9, 22))).toBeNull();
  });
});
