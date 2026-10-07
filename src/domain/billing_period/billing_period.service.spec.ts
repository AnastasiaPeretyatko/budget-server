import { DataSource, Repository } from 'typeorm';
// categories.entity должен загружаться раньше transition.entity: у сущностей
// циклические импорты, и в обратном порядке TransactionType ещё не определён
import '../categories/categories.entity';
import { CategoriesEntity } from '../categories/categories.entity';
import {
  BillingPeriodEntity,
  BillingPeriodStatus,
} from './billing_period.entity';
import { BillingPeriodService } from './billing_period.service';

const WORKSPACE = 'ws-1';

type Row = Record<string, unknown>;

const makePeriod = (overrides: Partial<BillingPeriodEntity> = {}) =>
  ({
    id: 'period-1',
    workspaceId: WORKSPACE,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    startDay: null,
    status: BillingPeriodStatus.COMPLETED,
    createdAt: new Date('2026-08-01'),
    ...overrides,
  }) as BillingPeriodEntity;

const makeCategory = (overrides: Partial<CategoriesEntity> = {}) =>
  ({
    id: 'cat-1',
    name: 'Еда',
    icon: 'Cart',
    color: '#16A34A',
    defaultLimit: '45000.00',
    workspaceId: WORKSPACE,
    ...overrides,
  }) as CategoriesEntity;

// Хранилище в памяти, которое умеет откатывать транзакцию: внутри
// datasource.transaction изменения идут в копию и применяются только если
// callback завершился без ошибки. Прямые записи через обычный репозиторий
// (не через manager) откатить нельзя — как и в настоящей базе.
function setup({
  periods = [] as BillingPeriodEntity[],
  categories = [makeCategory()],
  failOnSave = false,
} = {}) {
  const state = { periods: structuredClone(periods) as unknown as Row[] };
  const categoriesFind = jest.fn(() => Promise.resolve(categories));

  const makePeriodsRepo = (getRows: () => Row[]) => ({
    findOne: jest.fn(() =>
      Promise.resolve(
        getRows().find(
          (p) => p.workspaceId === WORKSPACE && p.status === 'active',
        ) ?? null,
      ),
    ),
    findOneBy: jest.fn((where: Row) =>
      Promise.resolve(
        getRows().find((p) =>
          Object.entries(where).every(([k, v]) => p[k] === v),
        ) ?? null,
      ),
    ),
    update: jest.fn((id: string, changes: Row) => {
      const row = getRows().find((p) => p.id === id)!;
      for (const [key, value] of Object.entries(changes)) {
        row[key] = typeof value === 'function' ? 'DB_NOW' : value;
      }
      return Promise.resolve();
    }),
    save: jest.fn((data: Row) => {
      if (failOnSave) return Promise.reject(new Error('insert failed'));
      const row = { id: 'period-new', status: 'active', ...data };
      getRows().push(row);
      return Promise.resolve(row);
    }),
  });

  const liveRepo = makePeriodsRepo(() => state.periods);
  const txRepos: Array<ReturnType<typeof makePeriodsRepo>> = [];

  const transaction = jest.fn(async (callback: (m: unknown) => unknown) => {
    const draft = structuredClone(state.periods);
    const txRepo = makePeriodsRepo(() => draft);
    txRepos.push(txRepo);
    const manager = {
      getRepository: (entity: unknown) =>
        entity === CategoriesEntity ? { find: categoriesFind } : txRepo,
    };
    const result = await callback(manager);
    state.periods = draft;
    return result;
  });

  const service = new BillingPeriodService(
    liveRepo as unknown as Repository<BillingPeriodEntity>,
    { transaction } as unknown as DataSource,
  );

  return { service, state, liveRepo, txRepos, transaction, categoriesFind };
}

const periodById = (state: { periods: Row[] }, id: string) =>
  state.periods.find((p) => p.id === id)!;

describe('BillingPeriodService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 6, 12, 0, 0).getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCycleById', () => {
    const today = new Date(2026, 9, 6);

    it('завершённый период: границы берутся из его дат', async () => {
      const { service } = setup({ periods: [makePeriod()] });

      expect(await service.getCycleById('period-1', WORKSPACE, today)).toEqual({
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        daysTotal: 31,
        daysLeft: 0,
      });
    });

    it('период без конца: endDate и daysTotal = null', async () => {
      const { service } = setup({
        periods: [
          makePeriod({ endDate: null, status: BillingPeriodStatus.ACTIVE }),
        ],
      });

      expect(await service.getCycleById('period-1', WORKSPACE, today)).toEqual({
        startDate: '2026-08-01',
        endDate: null,
        daysTotal: null,
        daysLeft: null,
      });
    });

    it('период другого workspace или несуществующий — 400', async () => {
      const { service } = setup({ periods: [makePeriod()] });

      await expect(
        service.getCycleById('period-1', 'other-ws', today),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        service.getCycleById('missing', WORKSPACE, today),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('create: закрытие прошлого периода', () => {
    const active = makePeriod({
      id: 'old',
      status: BillingPeriodStatus.ACTIVE,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    it('закрывает прошлый период с планом, снимком и closed_at и создаёт следующий', async () => {
      const { service, state } = setup({
        periods: [active],
        categories: [
          makeCategory({ id: 'c1', name: 'Еда', defaultLimit: '45000.00' }),
          makeCategory({
            id: 'c2',
            name: 'Транспорт',
            defaultLimit: '10000.5',
          }),
          makeCategory({ id: 'c3', name: 'Без лимита', defaultLimit: null }),
          makeCategory({ id: 'c4', name: 'Нулевой', defaultLimit: '0.00' }),
        ],
      });

      const created = await service.create(
        { startDate: '2026-10-01', endDate: '2026-10-31' },
        WORKSPACE,
      );

      expect(created).toMatchObject({
        id: 'period-new',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        workspaceId: WORKSPACE,
      });
      expect(periodById(state, 'old')).toMatchObject({
        status: 'completed',
        // даты были — остаются как есть
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        plannedAmount: '55000.50',
        planSnapshot: [
          {
            categoryId: 'c1',
            name: 'Еда',
            icon: 'Cart',
            color: '#16A34A',
            limit: '45000.00',
          },
          {
            categoryId: 'c2',
            name: 'Транспорт',
            icon: 'Cart',
            color: '#16A34A',
            limit: '10000.50',
          },
        ],
        closedAt: 'DB_NOW',
      });
    });

    it('категории берутся только этого workspace', async () => {
      const { service, categoriesFind } = setup({ periods: [active] });

      await service.create({ startDay: 7 }, WORKSPACE);

      expect(categoriesFind).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workspaceId: WORKSPACE } }),
      );
    });

    it('активного периода нет — просто создаёт новый', async () => {
      const { service, state, txRepos } = setup({ periods: [] });

      await service.create({ startDay: 7 }, WORKSPACE);

      expect(txRepos[0].update).not.toHaveBeenCalled();
      expect(state.periods).toHaveLength(1);
    });

    it('категорий с лимитом нет: план 0.00 и пустой снимок (а не null)', async () => {
      const { service, state } = setup({
        periods: [active],
        categories: [makeCategory({ defaultLimit: null })],
      });

      await service.create({ startDay: 7 }, WORKSPACE);

      expect(periodById(state, 'old')).toMatchObject({
        plannedAmount: '0.00',
        planSnapshot: [],
      });
    });

    it('атомарность: закрытие и создание — в одной транзакции', async () => {
      const { service, transaction, liveRepo, txRepos } = setup({
        periods: [active],
      });

      await service.create({ startDay: 7 }, WORKSPACE);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(txRepos[0].update).toHaveBeenCalledTimes(1);
      expect(txRepos[0].save).toHaveBeenCalledTimes(1);
      // вне транзакции ничего не пишется
      expect(liveRepo.update).not.toHaveBeenCalled();
      expect(liveRepo.save).not.toHaveBeenCalled();
    });

    it('атомарность: если создание упало — прошлый период остаётся активным и без плана', async () => {
      const { service, state } = setup({ periods: [active], failOnSave: true });

      await expect(service.create({ startDay: 7 }, WORKSPACE)).rejects.toThrow(
        'insert failed',
      );

      expect(state.periods).toHaveLength(1);
      expect(periodById(state, 'old')).toMatchObject({ status: 'active' });
      expect(periodById(state, 'old').plannedAmount).toBeUndefined();
      expect(periodById(state, 'old').closedAt).toBeUndefined();
    });
  });

  describe('закрытие периода, заданного только числом месяца', () => {
    // Сегодня 2026-10-06, startDay = 7 → цикл 2026-09-07 … 2026-10-06
    it('даты ставятся по calculateCycleBounds на день закрытия', async () => {
      const { service, state } = setup({
        periods: [
          makePeriod({
            id: 'old',
            status: BillingPeriodStatus.ACTIVE,
            startDate: null,
            endDate: null,
            startDay: 7,
          }),
        ],
      });

      await service.create({ startDay: 7 }, WORKSPACE);

      expect(periodById(state, 'old')).toMatchObject({
        status: 'completed',
        startDate: '2026-09-07',
        endDate: '2026-10-06',
      });
    });

    it('начало есть, конца нет — конец это сегодняшний день', async () => {
      const { service, state } = setup({
        periods: [
          makePeriod({
            id: 'old',
            status: BillingPeriodStatus.ACTIVE,
            startDate: '2026-09-15',
            endDate: null,
            startDay: null,
          }),
        ],
      });

      await service.create({ startDay: 7 }, WORKSPACE);

      expect(periodById(state, 'old')).toMatchObject({
        startDate: '2026-09-15',
        endDate: '2026-10-06',
      });
    });
  });

  describe('update: status = completed', () => {
    const active = makePeriod({
      id: 'p',
      status: BillingPeriodStatus.ACTIVE,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    it('закрывает период: план, снимок и closed_at записываются', async () => {
      const { service, state } = setup({
        periods: [active],
        categories: [makeCategory({ id: 'c1', defaultLimit: '1000.00' })],
      });

      await service.update(
        { id: 'p', status: BillingPeriodStatus.COMPLETED },
        WORKSPACE,
      );

      expect(periodById(state, 'p')).toMatchObject({
        status: 'completed',
        plannedAmount: '1000.00',
        planSnapshot: [expect.objectContaining({ categoryId: 'c1' })],
        closedAt: 'DB_NOW',
      });
    });

    it('вместе с датами: закрытие видит новые даты, всё в одной транзакции', async () => {
      const { service, state, transaction } = setup({
        periods: [
          makePeriod({
            id: 'p',
            status: BillingPeriodStatus.ACTIVE,
            startDate: null,
            endDate: null,
            startDay: 7,
          }),
        ],
      });

      await service.update(
        {
          id: 'p',
          status: BillingPeriodStatus.COMPLETED,
          startDate: '2026-10-01',
          endDate: '2026-10-05',
        },
        WORKSPACE,
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(periodById(state, 'p')).toMatchObject({
        status: 'completed',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });
    });

    it('уже закрытый период не пересчитывается', async () => {
      const closed = makePeriod({ id: 'p' }) as unknown as Row;
      closed.plannedAmount = '999.00';
      closed.planSnapshot = [];
      const { service, state, txRepos } = setup({
        periods: [closed as unknown as BillingPeriodEntity],
      });

      await service.update(
        { id: 'p', status: BillingPeriodStatus.COMPLETED },
        WORKSPACE,
      );

      expect(txRepos[0].update).not.toHaveBeenCalled();
      expect(periodById(state, 'p')).toMatchObject({
        plannedAmount: '999.00',
        planSnapshot: [],
      });
      expect(periodById(state, 'p').closedAt).toBeUndefined();
    });

    it('старый закрытый период не заполняется задним числом', async () => {
      const { service, state } = setup({ periods: [makePeriod({ id: 'p' })] });

      await service.update({ id: 'p', startDay: 5 }, WORKSPACE);

      expect(periodById(state, 'p').plannedAmount).toBeUndefined();
      expect(periodById(state, 'p').planSnapshot).toBeUndefined();
      expect(periodById(state, 'p').closedAt).toBeUndefined();
    });
  });

  describe('update: обычные поля', () => {
    const active = makePeriod({
      id: 'p',
      status: BillingPeriodStatus.ACTIVE,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    it('без status период не закрывается', async () => {
      const { service, state } = setup({ periods: [active] });

      await service.update({ id: 'p', endDate: '2026-11-05' }, WORKSPACE);

      expect(periodById(state, 'p')).toMatchObject({
        status: 'active',
        endDate: '2026-11-05',
      });
      expect(periodById(state, 'p').closedAt).toBeUndefined();
    });

    it('endDate раньше текущего startDate — 400', async () => {
      const { service, state } = setup({ periods: [active] });

      await expect(
        service.update({ id: 'p', endDate: '2026-09-30' }, WORKSPACE),
      ).rejects.toMatchObject({ status: 400 });
      expect(periodById(state, 'p').endDate).toBe('2026-10-31');
    });

    it('startDate позже текущего endDate — 400', async () => {
      const { service } = setup({ periods: [active] });

      await expect(
        service.update({ id: 'p', startDate: '2026-11-01' }, WORKSPACE),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('обе даты меняются вместе — проверяются друг с другом, а не со старыми', async () => {
      const { service, state } = setup({ periods: [active] });

      await service.update(
        { id: 'p', startDate: '2026-12-01', endDate: '2026-12-31' },
        WORKSPACE,
      );

      expect(periodById(state, 'p')).toMatchObject({
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    });

    it('чужой или несуществующий период — 400', async () => {
      const { service } = setup({ periods: [active] });

      await expect(
        service.update({ id: 'missing' }, WORKSPACE),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('пустой PATCH не падает', async () => {
      const { service, txRepos } = setup({ periods: [active] });

      await service.update({ id: 'p' }, WORKSPACE);

      expect(txRepos[0].update).not.toHaveBeenCalled();
    });
  });
});
