import { MacroFund } from '../../categories/types';
import {
  buildDailyPoints,
  buildPlanReport,
  buildTagSlices,
  CategoryMeta,
  ReportPeriod,
} from './plan-report';

const meta = (
  name: string,
  macroFund: MacroFund | null = null,
): CategoryMeta => ({ name, icon: null, color: null, macroFund });

const item = (categoryId: string, name: string, limit: string) => ({
  categoryId,
  name,
  icon: null,
  color: null,
  limit,
});

const period = (
  id: string,
  items: ReturnType<typeof item>[] | null,
  planned?: string,
): ReportPeriod => ({
  id,
  from: '2026-09-01',
  to: '2026-09-28',
  plan:
    items === null
      ? null
      : {
          planned:
            planned ??
            items.reduce((acc, i) => acc + Number(i.limit), 0).toFixed(2),
          items,
        },
});

const categoryMeta = new Map<string, CategoryMeta>([
  ['food', meta('Еда', MacroFund.ESSENTIALS)],
  ['fun', meta('Развлечения', MacroFund.LIFESTYLE)],
  ['invest', meta('Инвестиции', MacroFund.SAVINGS)],
  ['misc', meta('Разное')],
]);

describe('buildPlanReport', () => {
  it('считает план, факт и расходы без категории', () => {
    const report = buildPlanReport({
      periods: [period('p1', [item('food', 'Еда', '10000.00')])],
      spentRows: [
        { periodId: 'p1', categoryId: 'food', total: '4000.50' },
        { periodId: 'p1', categoryId: null, total: '99.50' },
      ],
      categoryMeta,
    });

    expect(report.planned).toBe('10000.00');
    expect(report.spent).toBe('4100.00');
    expect(report.unassignedSpent).toBe('99.50');
    expect(report.categories).toHaveLength(1);
    expect(report.categories[0]).toMatchObject({
      categoryId: 'food',
      planned: '10000.00',
      spent: '4000.50',
      percent: 40,
      status: 'ok',
    });
  });

  it('суммирует план и факт конверта по нескольким циклам', () => {
    const report = buildPlanReport({
      periods: [
        period('p1', [item('food', 'Еда', '1000.00')]),
        period('p2', [item('food', 'Еда', '1500.00')]),
      ],
      spentRows: [
        { periodId: 'p1', categoryId: 'food', total: '900.00' },
        { periodId: 'p2', categoryId: 'food', total: '1200.00' },
      ],
      categoryMeta,
    });

    expect(report.categories[0]).toMatchObject({
      planned: '2500.00',
      spent: '2100.00',
      percent: 84,
      status: 'warning',
    });
    expect(report.periodPoints.map((p) => p.spent)).toEqual([
      '900.00',
      '1200.00',
    ]);
  });

  it('дисциплина: считает конверты без перерасхода, только с лимитом', () => {
    const report = buildPlanReport({
      periods: [
        period('p1', [
          item('food', 'Еда', '1000.00'),
          item('fun', 'Развлечения', '500.00'),
          item('invest', 'Инвестиции', '300.00'),
        ]),
      ],
      spentRows: [
        { periodId: 'p1', categoryId: 'food', total: '1000.00' },
        { periodId: 'p1', categoryId: 'fun', total: '700.00' },
        // конверт без лимита в дисциплину не входит
        { periodId: 'p1', categoryId: 'misc', total: '5000.00' },
      ],
      categoryMeta,
    });

    expect(report.discipline).toEqual({ respected: 2, total: 3 });
    const misc = report.categories.find((c) => c.categoryId === 'misc');
    expect(misc).toMatchObject({
      planned: null,
      percent: null,
      status: 'no_limit',
    });
  });

  it('точно по лимиту — не перерасход, больше — перерасход', () => {
    const report = buildPlanReport({
      periods: [
        period('p1', [
          item('food', 'Еда', '1000.00'),
          item('fun', 'Развлечения', '1000.00'),
        ]),
      ],
      spentRows: [
        { periodId: 'p1', categoryId: 'food', total: '1000.00' },
        { periodId: 'p1', categoryId: 'fun', total: '1000.01' },
      ],
      categoryMeta,
    });

    const food = report.categories.find((c) => c.categoryId === 'food');
    const fun = report.categories.find((c) => c.categoryId === 'fun');
    expect(food?.status).toBe('warning');
    expect(fun?.status).toBe('warning'); // 100.0001% округляется до 100
    expect(report.discipline).toEqual({ respected: 2, total: 2 });

    const over = buildPlanReport({
      periods: [period('p1', [item('food', 'Еда', '1000.00')])],
      spentRows: [{ periodId: 'p1', categoryId: 'food', total: '1010.00' }],
      categoryMeta,
    });
    expect(over.categories[0].status).toBe('exceeded');
    expect(over.discipline).toEqual({ respected: 0, total: 1 });
  });

  it('цикл без плана: плана нет, расходы всё равно считаются', () => {
    const report = buildPlanReport({
      periods: [period('p1', null)],
      spentRows: [{ periodId: 'p1', categoryId: 'food', total: '300.00' }],
      categoryMeta,
    });

    expect(report.planned).toBe('0.00');
    expect(report.spent).toBe('300.00');
    expect(report.periodPoints[0]).toMatchObject({
      planned: null,
      spent: '300.00',
    });
    expect(report.discipline).toEqual({ respected: 0, total: 0 });
  });

  it('удалённой категории берёт имя из снимка плана', () => {
    const report = buildPlanReport({
      periods: [period('p1', [item('gone', 'Старая', '500.00')])],
      spentRows: [],
      categoryMeta,
    });

    expect(report.categories[0]).toMatchObject({
      name: 'Старая',
      macroFund: null,
    });
  });

  it('матрица фондов: доли считаются от суммы по трём фондам', () => {
    const report = buildPlanReport({
      periods: [
        period('p1', [
          item('food', 'Еда', '5000.00'),
          item('fun', 'Развлечения', '3000.00'),
          item('invest', 'Инвестиции', '2000.00'),
        ]),
      ],
      spentRows: [
        { periodId: 'p1', categoryId: 'food', total: '6000.00' },
        { periodId: 'p1', categoryId: 'fun', total: '3000.00' },
        { periodId: 'p1', categoryId: 'invest', total: '1000.00' },
        // категория без фонда и расходы без категории — в «не распределено»
        { periodId: 'p1', categoryId: 'misc', total: '400.00' },
        { periodId: 'p1', categoryId: null, total: '100.00' },
      ],
      categoryMeta,
    });

    const [essentials, lifestyle, savings] = report.funds;
    expect(essentials).toMatchObject({
      fund: MacroFund.ESSENTIALS,
      planned: '5000.00',
      spent: '6000.00',
      plannedShare: 50,
      actualShare: 60,
    });
    expect(lifestyle).toMatchObject({ plannedShare: 30, actualShare: 30 });
    expect(savings).toMatchObject({ plannedShare: 20, actualShare: 10 });
    expect(report.unassignedSpent).toBe('500.00');
  });

  it('без данных доли фондов — null', () => {
    const report = buildPlanReport({
      periods: [],
      spentRows: [],
      categoryMeta,
    });

    expect(report.funds).toHaveLength(3);
    for (const fund of report.funds) {
      expect(fund.plannedShare).toBeNull();
      expect(fund.actualShare).toBeNull();
    }
    expect(report.discipline).toEqual({ respected: 0, total: 0 });
    expect(report.planned).toBe('0.00');
  });

  it('конверты сортируются по расходу, при равенстве — по имени', () => {
    const report = buildPlanReport({
      periods: [period('p1', [])],
      spentRows: [
        { periodId: 'p1', categoryId: 'fun', total: '100.00' },
        { periodId: 'p1', categoryId: 'food', total: '100.00' },
        { periodId: 'p1', categoryId: 'invest', total: '500.00' },
      ],
      categoryMeta,
    });

    expect(report.categories.map((c) => c.name)).toEqual([
      'Инвестиции',
      'Еда',
      'Развлечения',
    ]);
  });
});

describe('buildDailyPoints', () => {
  const base = {
    from: '2026-10-01',
    cycleEnd: '2026-10-04',
    today: '2026-10-02',
    plannedCents: 400000,
  };

  it('план растёт равномерно, факт накопительно и обрывается после сегодня', () => {
    const points = buildDailyPoints({
      ...base,
      spentByDay: new Map([
        ['2026-10-01', 15000],
        ['2026-10-02', 5000],
      ]),
    });

    expect(points.map((p) => p.from)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(points.map((p) => p.planned)).toEqual([
      '1000.00',
      '2000.00',
      '3000.00',
      '4000.00',
    ]);
    expect(points.map((p) => p.spent)).toEqual([
      '150.00',
      '200.00',
      null,
      null,
    ]);
  });

  it('без конца цикла плановой линии нет, идёт до сегодня', () => {
    const points = buildDailyPoints({
      ...base,
      cycleEnd: null,
      spentByDay: new Map(),
    });

    expect(points).toHaveLength(2);
    expect(points.every((p) => p.planned === null)).toBe(true);
  });

  it('план 0 или его отсутствие — без плановой линии', () => {
    for (const plannedCents of [0, null]) {
      const points = buildDailyPoints({
        ...base,
        plannedCents,
        spentByDay: new Map(),
      });
      expect(points.every((p) => p.planned === null)).toBe(true);
    }
  });

  it('начало цикла позже конца — пусто', () => {
    expect(
      buildDailyPoints({
        ...base,
        from: '2026-10-10',
        spentByDay: new Map(),
      }),
    ).toEqual([]);
  });
});

describe('buildTagSlices', () => {
  const tag = (name: string, total: string, count = 1) => ({
    tagId: name,
    name,
    color: '#fff',
    total,
    count,
  });

  it('сортирует по сумме и считает проценты от суммы срезов', () => {
    const slices = buildTagSlices([tag('a', '100.00'), tag('b', '300.00')], {
      total: '100.00',
      count: 2,
    });

    expect(slices.map((s) => [s.name, s.percent])).toEqual([
      ['b', 60],
      ['a', 20],
      ['Без тегов', 20],
    ]);
  });

  it('не добавляет «Без тегов», если таких расходов нет', () => {
    const slices = buildTagSlices([tag('a', '100.00')], {
      total: '0',
      count: 0,
    });

    expect(slices.map((s) => s.name)).toEqual(['a']);
    expect(slices[0].percent).toBe(100);
  });

  it('хвост тегов складывает в «Остальные теги»', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      tag(`t${i}`, `${(5 - i) * 100}.00`, 2),
    );

    const slices = buildTagSlices(rows, { total: '0', count: 0 }, 3);

    expect(slices.map((s) => s.name)).toEqual(['t0', 't1', 'Остальные теги']);
    expect(slices[2]).toMatchObject({
      tagId: null,
      total: '600.00',
      count: 6,
    });
  });

  it('без данных — пустой список', () => {
    expect(buildTagSlices([], { total: '0', count: 0 })).toEqual([]);
  });
});
