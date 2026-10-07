import { DataSource, Repository } from 'typeorm';
// categories.entity должен загружаться раньше transition.entity: у сущностей
// циклические импорты, и в обратном порядке TransactionType ещё не определён
import '../categories/categories.entity';
import type { CategoriesEntity } from '../categories/categories.entity';
import { TransitionEntity } from '../transition/transition.entity';
import {
  BillingPeriodEntity,
  BillingPeriodStatus,
} from './billing_period.entity';
import { BillingPeriodSummaryService } from './billing_period_summary.service';
import { PlanSnapshotItem } from './types';

const WORKSPACE = 'ws-1';

const makePeriod = (overrides: Partial<BillingPeriodEntity> = {}) =>
  ({
    id: 'period-1',
    workspaceId: WORKSPACE,
    startDate: '2026-10-01',
    endDate: '2026-10-10',
    startDay: null,
    status: BillingPeriodStatus.ACTIVE,
    plannedAmount: null,
    planSnapshot: null,
    ...overrides,
  }) as BillingPeriodEntity;

const makeCategory = (overrides: Partial<CategoriesEntity> = {}) =>
  ({
    id: 'cat-1',
    name: 'Еда',
    icon: 'ShoppingCart',
    color: '#16A34A',
    defaultLimit: '45000.00',
    workspaceId: WORKSPACE,
    deletedAt: null,
    ...overrides,
  }) as unknown as CategoriesEntity;

type SpentRow = { categoryId: string | null; total: string };

function setup({
  period = makePeriod() as BillingPeriodEntity | null,
  periods = [] as BillingPeriodEntity[],
  categories = [makeCategory()],
  spentRows = [] as SpentRow[],
  historySpent = [] as Array<{ id: string; total: string }>,
} = {}) {
  const periodQb: Record<string, jest.Mock> = {};
  for (const method of ['addSelect', 'where', 'andWhere', 'orderBy']) {
    periodQb[method] = jest.fn(() => periodQb);
  }
  periodQb.getOne = jest.fn(() => Promise.resolve(period));
  periodQb.getMany = jest.fn(() => Promise.resolve(periods));
  const periodsRepo = { createQueryBuilder: jest.fn(() => periodQb) };

  const spentQb: Record<string, jest.Mock> = {};
  for (const method of [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
  ]) {
    spentQb[method] = jest.fn(() => spentQb);
  }
  spentQb.getRawMany = jest.fn(() => Promise.resolve(spentRows));
  const transitionRepo = { createQueryBuilder: jest.fn(() => spentQb) };

  const categoriesFind = jest.fn(() => Promise.resolve(categories));
  const query = jest.fn(() => Promise.resolve(historySpent));

  const datasource = {
    getRepository: jest.fn((entity: unknown) =>
      entity === TransitionEntity ? transitionRepo : { find: categoriesFind },
    ),
    query,
  } as unknown as DataSource;

  return {
    service: new BillingPeriodSummaryService(
      periodsRepo as unknown as Repository<BillingPeriodEntity>,
      datasource,
    ),
    periodQb,
    spentQb,
    categoriesFind,
    query,
  };
}

// 2026-10-06: у периода 01..10 октября 10 дней, прошло 5, осталось 5
const TODAY = new Date(2026, 9, 6, 12, 0, 0);

const snapshot: PlanSnapshotItem[] = [
  {
    categoryId: 'cat-1',
    name: 'Еда',
    icon: 'ShoppingCart',
    color: '#16A34A',
    limit: '30000.00',
  },
  {
    categoryId: 'cat-gone',
    name: 'Старая категория',
    icon: null,
    color: null,
    limit: '20000.00',
  },
];

describe('BillingPeriodSummaryService.getSummary', () => {
  describe('активный период', () => {
    const categories = [
      makeCategory({ id: 'cat-1', name: 'Еда', defaultLimit: '45000.00' }),
      makeCategory({
        id: 'cat-2',
        name: 'Транспорт',
        icon: 'Car',
        color: '#2563EB',
        defaultLimit: '20000.00',
      }),
      makeCategory({ id: 'cat-3', name: 'Без лимита', defaultLimit: null }),
      makeCategory({
        id: 'cat-del',
        name: 'Удалённая',
        defaultLimit: '9999.00',
        deletedAt: new Date('2026-09-01'),
      } as Partial<CategoriesEntity>),
    ];
    const spentRows: SpentRow[] = [
      { categoryId: 'cat-1', total: '32400.00' },
      { categoryId: 'cat-2', total: '5000.50' },
      { categoryId: 'cat-3', total: '300.00' },
      { categoryId: 'cat-del', total: '100.00' },
      { categoryId: null, total: '3200.00' },
    ];

    it('план — живой (лимиты категорий сейчас), удалённые категории в план не входят', async () => {
      const { service } = setup({ categories, spentRows });

      const summary = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(summary).toMatchObject({
        planned: '65000.00',
        plannedCategories: 2,
        spent: '41000.50',
        delta: '23999.50',
        uncategorizedSpent: '3200.00',
      });
    });

    it('блок period: дни считаются от сегодня', async () => {
      const { service } = setup({ categories, spentRows });

      const { period } = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(period).toEqual({
        id: 'period-1',
        status: 'active',
        startDate: '2026-10-01',
        endDate: '2026-10-10',
        startDay: null,
        daysTotal: 10,
        daysLeft: 5,
        daysPassed: 5,
      });
    });

    it('темп и прогноз: сегодняшний день считается прошедшим', async () => {
      const { service } = setup({ categories, spentRows });

      const { pace, forecast } = await service.getSummary(
        'period-1',
        WORKSPACE,
        TODAY,
      );

      // elapsedDays = 5 + 1 = 6; ожидаемо 65000 * 6 / 10 = 39000.00
      expect(pace).toEqual({
        expectedSpent: '39000.00',
        // (41000.50 − 39000) / 39000 × 100 = 5.13 → 5
        deltaPercent: 5,
      });
      // 41000.50 / 6 × 10 = 68334.17; остаток 65000 − 68334.17
      expect(forecast).toEqual({ spent: '68334.17', balance: '-3334.17' });
    });

    it('категории: с лимитом или с расходами (включая удалённую), больше расходов — выше', async () => {
      const { service } = setup({ categories, spentRows });

      const { categories: list } = await service.getSummary(
        'period-1',
        WORKSPACE,
        TODAY,
      );

      expect(list).toEqual([
        {
          categoryId: 'cat-1',
          name: 'Еда',
          icon: 'ShoppingCart',
          color: '#16A34A',
          planned: '45000.00',
          spent: '32400.00',
          delta: '12600.00',
        },
        {
          categoryId: 'cat-2',
          name: 'Транспорт',
          icon: 'Car',
          color: '#2563EB',
          planned: '20000.00',
          spent: '5000.50',
          delta: '14999.50',
        },
        // нет лимита — planned и delta = null
        {
          categoryId: 'cat-3',
          name: 'Без лимита',
          icon: 'ShoppingCart',
          color: '#16A34A',
          planned: null,
          spent: '300.00',
          delta: null,
        },
        {
          categoryId: 'cat-del',
          name: 'Удалённая',
          icon: 'ShoppingCart',
          color: '#16A34A',
          planned: null,
          spent: '100.00',
          delta: null,
        },
      ]);
    });

    it('категория с лимитом, но без расходов, тоже в списке (spent 0.00)', async () => {
      const { service } = setup({ categories, spentRows: [] });

      const { categories: list, spent } = await service.getSummary(
        'period-1',
        WORKSPACE,
        TODAY,
      );

      expect(spent).toBe('0.00');
      expect(list.map((c) => [c.categoryId, c.spent, c.delta])).toEqual([
        ['cat-1', '0.00', '45000.00'],
        ['cat-2', '0.00', '20000.00'],
      ]);
    });

    it('расходы считаются с начала цикла по сегодня (а не до конца цикла)', async () => {
      const { service, spentQb } = setup({ categories, spentRows });

      await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(spentQb.andWhere).toHaveBeenCalledWith(
        't.date >= CAST(:from AS date)',
        { from: '2026-10-01' },
      );
      expect(spentQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('t.date < CAST(:to AS date) + 1'),
        { to: '2026-10-06' },
      );
    });

    it('считаются только расходы (from != null, to = null)', async () => {
      const { service, spentQb } = setup({ categories, spentRows });

      await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(spentQb.andWhere).toHaveBeenCalledWith(
        't.fromAccountId IS NOT NULL',
      );
      expect(spentQb.andWhere).toHaveBeenCalledWith('t.toAccountId IS NULL');
    });

    it('плана нет (лимитов нет): planned 0.00, delta и остаток прогноза null, темп без ожидаемого', async () => {
      const { service } = setup({
        categories: [makeCategory({ defaultLimit: null })],
        spentRows: [{ categoryId: null, total: '600.00' }],
      });

      const summary = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(summary).toMatchObject({
        planned: '0.00',
        plannedCategories: 0,
        spent: '600.00',
        delta: null,
        pace: { expectedSpent: null, deltaPercent: null },
        // 600 / 6 × 10 = 1000
        forecast: { spent: '1000.00', balance: null },
      });
    });

    it('daysTotal неизвестен (нет конца): daysPassed, ожидаемое и прогноз = null', async () => {
      const { service, spentQb } = setup({
        period: makePeriod({ startDate: '2026-09-15', endDate: null }),
        categories,
        spentRows,
      });

      const summary = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(summary.period).toMatchObject({
        startDate: '2026-09-15',
        endDate: null,
        daysTotal: null,
        daysLeft: null,
        daysPassed: null,
      });
      expect(summary.pace).toEqual({ expectedSpent: null, deltaPercent: null });
      expect(summary.forecast).toEqual({ spent: null, balance: null });
      // конца нет — расходы до сегодня
      expect(spentQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(':to'),
        { to: '2026-10-06' },
      );
    });

    it('цикл по числу месяца: даты и дни считаются от сегодня', async () => {
      const { service } = setup({
        period: makePeriod({ startDate: null, endDate: null, startDay: 1 }),
        categories,
        spentRows,
      });

      const { period } = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(period).toMatchObject({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        startDay: 1,
        daysTotal: 31,
        daysLeft: 26,
        daysPassed: 5,
      });
    });

    it('цикл уже закончился, а период ещё активен: элапсед не больше daysTotal, расходы до конца цикла', async () => {
      const { service, spentQb } = setup({
        period: makePeriod({ startDate: '2026-09-01', endDate: '2026-09-10' }),
        categories,
        spentRows: [{ categoryId: 'cat-1', total: '10000.00' }],
      });

      const { period, pace, forecast } = await service.getSummary(
        'period-1',
        WORKSPACE,
        TODAY,
      );

      expect(period).toMatchObject({
        daysTotal: 10,
        daysLeft: 0,
        daysPassed: 10,
      });
      // elapsed = min(10, 11) = 10: ожидаемо весь план
      expect(pace?.expectedSpent).toBe('65000.00');
      expect(forecast?.spent).toBe('10000.00');
      expect(spentQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(':to'),
        { to: '2026-09-10' },
      );
    });

    it('расходы меньше нормы — deltaPercent отрицательный', async () => {
      const { service } = setup({
        categories: [makeCategory({ defaultLimit: '60000.00' })],
        // ожидаемо 60000 × 6 / 10 = 36000; потрачено 18000 → −50 %
        spentRows: [{ categoryId: 'cat-1', total: '18000.00' }],
      });

      const { pace } = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(pace?.deltaPercent).toBe(-50);
    });

    it('ничего не потрачено — deltaPercent −100, а не −0', async () => {
      const { service } = setup({ categories, spentRows: [] });

      const { pace } = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(pace?.deltaPercent).toBe(-100);
    });
  });

  describe('завершённый период', () => {
    const completed = (overrides: Partial<BillingPeriodEntity> = {}) =>
      makePeriod({
        status: BillingPeriodStatus.COMPLETED,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        plannedAmount: '50000.00',
        planSnapshot: snapshot,
        ...overrides,
      });

    // Сейчас лимит у «Еды» уже другой — в итогах он не должен учитываться
    const categories = [
      makeCategory({ id: 'cat-1', name: 'Еда', defaultLimit: '99999.00' }),
      makeCategory({ id: 'cat-new', name: 'Новая', defaultLimit: '7777.00' }),
    ];

    it('план и лимиты — из снимка, а не живые значения', async () => {
      const { service } = setup({
        period: completed(),
        categories,
        spentRows: [
          { categoryId: 'cat-1', total: '31000.00' },
          { categoryId: 'cat-gone', total: '2000.00' },
          { categoryId: null, total: '500.00' },
        ],
      });

      const summary = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(summary).toMatchObject({
        planned: '50000.00',
        plannedCategories: 2,
        spent: '33500.00',
        delta: '16500.00',
        uncategorizedSpent: '500.00',
        pace: null,
        forecast: null,
      });
      expect(summary.categories).toEqual([
        {
          categoryId: 'cat-1',
          name: 'Еда',
          icon: 'ShoppingCart',
          color: '#16A34A',
          planned: '30000.00',
          spent: '31000.00',
          delta: '-1000.00',
        },
        {
          categoryId: 'cat-gone',
          name: 'Старая категория',
          icon: null,
          color: null,
          planned: '20000.00',
          spent: '2000.00',
          delta: '18000.00',
        },
      ]);
    });

    it('категория с расходами, которой нет в снимке: в списке без плана', async () => {
      const { service } = setup({
        period: completed(),
        categories,
        spentRows: [{ categoryId: 'cat-new', total: '1200.00' }],
      });

      const { categories: list } = await service.getSummary(
        'period-1',
        WORKSPACE,
        TODAY,
      );

      expect(list[0]).toMatchObject({
        categoryId: 'cat-new',
        name: 'Новая',
        planned: null,
        spent: '1200.00',
        delta: null,
      });
      expect(list.map((c) => c.categoryId)).toEqual([
        'cat-new',
        'cat-1',
        'cat-gone',
      ]);
    });

    it('расходы — за весь период от startDate до endDate, не до сегодня', async () => {
      const { service, spentQb } = setup({ period: completed(), categories });

      await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(spentQb.andWhere).toHaveBeenCalledWith(
        't.date >= CAST(:from AS date)',
        { from: '2026-08-01' },
      );
      expect(spentQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(':to'),
        { to: '2026-08-31' },
      );
    });

    it('завершённый период, закрытый заранее (конец в будущем): весь период по endDate', async () => {
      const { service, spentQb } = setup({
        period: completed({ startDate: '2026-10-01', endDate: '2026-10-31' }),
        categories,
      });

      await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(spentQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(':to'),
        { to: '2026-10-31' },
      );
    });

    it('план 0.00 в снимке: delta = null', async () => {
      const { service } = setup({
        period: completed({ plannedAmount: '0.00', planSnapshot: [] }),
        categories,
        spentRows: [{ categoryId: null, total: '100.00' }],
      });

      const summary = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(summary).toMatchObject({
        planned: '0.00',
        plannedCategories: 0,
        delta: null,
      });
    });

    it('без снимка (старый период): planned, delta и planned у категорий = null', async () => {
      const { service } = setup({
        period: completed({ plannedAmount: null, planSnapshot: null }),
        categories,
        spentRows: [
          { categoryId: 'cat-1', total: '31000.00' },
          { categoryId: null, total: '500.00' },
        ],
      });

      const summary = await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(summary).toMatchObject({
        planned: null,
        plannedCategories: 0,
        spent: '31500.00',
        delta: null,
        pace: null,
        forecast: null,
      });
      expect(summary.categories).toEqual([
        {
          categoryId: 'cat-1',
          name: 'Еда',
          icon: 'ShoppingCart',
          color: '#16A34A',
          planned: null,
          spent: '31000.00',
          delta: null,
        },
      ]);
    });

    it('план читается из planned_amount и снимка (select: false — явно запрошены)', async () => {
      const { service, periodQb } = setup({ period: completed(), categories });

      await service.getSummary('period-1', WORKSPACE, TODAY);

      expect(periodQb.addSelect).toHaveBeenCalledWith([
        'p.plannedAmount',
        'p.planSnapshot',
      ]);
    });
  });

  it('период другого workspace или несуществующий — 400', async () => {
    const { service, periodQb } = setup({ period: null });

    await expect(
      service.getSummary('period-1', WORKSPACE, TODAY),
    ).rejects.toMatchObject({ status: 400 });
    expect(periodQb.andWhere).toHaveBeenCalledWith(
      'p.workspaceId = :workspaceId',
      { workspaceId: WORKSPACE },
    );
  });

  it('период без дат и без startDay — 400', async () => {
    const { service } = setup({
      period: makePeriod({ startDate: null, endDate: null, startDay: null }),
    });

    await expect(
      service.getSummary('period-1', WORKSPACE, TODAY),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('BillingPeriodSummaryService.getHistory', () => {
  const completed = (
    id: string,
    startDate: string,
    endDate: string,
    plannedAmount: string | null,
  ) =>
    makePeriod({
      id,
      status: BillingPeriodStatus.COMPLETED,
      startDate,
      endDate,
      plannedAmount,
    });

  it('три результата: success, overspent, no_plan (плана нет или он 0)', async () => {
    const periods = [
      completed('p-ok', '2026-09-01', '2026-09-30', '180000.00'),
      completed('p-over', '2026-08-01', '2026-08-31', '100000.00'),
      completed('p-null', '2026-07-01', '2026-07-31', null),
      completed('p-zero', '2026-06-01', '2026-06-30', '0.00'),
      completed('p-exact', '2026-05-01', '2026-05-31', '1000.00'),
    ];
    const { service } = setup({
      periods,
      historySpent: [
        { id: 'p-ok', total: '178400.00' },
        { id: 'p-over', total: '104500.50' },
        { id: 'p-null', total: '5000.00' },
        { id: 'p-zero', total: '300.00' },
        { id: 'p-exact', total: '1000.00' },
      ],
    });

    expect(await service.getHistory(WORKSPACE, TODAY)).toEqual([
      {
        id: 'p-ok',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        daysTotal: 30,
        planned: '180000.00',
        spent: '178400.00',
        delta: '1600.00',
        result: 'success',
      },
      {
        id: 'p-over',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        daysTotal: 31,
        planned: '100000.00',
        spent: '104500.50',
        delta: '-4500.50',
        result: 'overspent',
      },
      {
        id: 'p-null',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        daysTotal: 31,
        planned: null,
        spent: '5000.00',
        delta: null,
        result: 'no_plan',
      },
      {
        id: 'p-zero',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        daysTotal: 30,
        planned: '0.00',
        spent: '300.00',
        delta: null,
        result: 'no_plan',
      },
      // потрачено ровно по плану: delta = 0 — это success
      {
        id: 'p-exact',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        daysTotal: 31,
        planned: '1000.00',
        spent: '1000.00',
        delta: '0.00',
        result: 'success',
      },
    ]);
  });

  it('расходы всех периодов — одним запросом', async () => {
    const { service, query } = setup({
      periods: [
        completed('p1', '2026-09-01', '2026-09-30', '100.00'),
        completed('p2', '2026-08-01', '2026-08-31', '100.00'),
        completed('p3', '2026-07-01', '2026-07-31', '100.00'),
      ],
      historySpent: [],
    });

    await service.getHistory(WORKSPACE, TODAY);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      WORKSPACE,
      ['p1', 'p2', 'p3'],
    ]);
  });

  it('период без расходов: spent 0.00', async () => {
    const { service } = setup({
      periods: [completed('p1', '2026-09-01', '2026-09-30', '100.00')],
      historySpent: [],
    });

    const [item] = await service.getHistory(WORKSPACE, TODAY);

    expect(item).toMatchObject({
      spent: '0.00',
      delta: '100.00',
      result: 'success',
    });
  });

  it('выбираются только завершённые периоды с датами, свежие сверху', async () => {
    const { service, periodQb } = setup({ periods: [] });

    await service.getHistory(WORKSPACE, TODAY);

    expect(periodQb.andWhere).toHaveBeenCalledWith('p.status = :status', {
      status: 'completed',
    });
    expect(periodQb.andWhere).toHaveBeenCalledWith('p.startDate IS NOT NULL');
    expect(periodQb.andWhere).toHaveBeenCalledWith('p.endDate IS NOT NULL');
    expect(periodQb.orderBy).toHaveBeenCalledWith('p.startDate', 'DESC');
    expect(periodQb.addSelect).toHaveBeenCalledWith('p.plannedAmount');
  });

  it('истории нет — пустой список, запрос расходов не выполняется', async () => {
    const { service, query } = setup({ periods: [] });

    expect(await service.getHistory(WORKSPACE, TODAY)).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
