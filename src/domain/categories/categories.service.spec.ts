import { DataSource } from 'typeorm';
// categories.entity должен загружаться раньше transition.entity: у сущностей
// циклические импорты, и в обратном порядке TransactionType ещё не определён
import './categories.entity';
import { TransitionEntity } from '../transition/transition.entity';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import { CycleBounds } from '../billing_period/utils/cycle-bounds';
import type { CategoriesEntity } from './categories.entity';
import { CategoriesService } from './categories.service';
import { MacroFund } from './types';

const WORKSPACE = 'ws-1';

const bounds: CycleBounds = {
  startDate: '2026-09-06',
  endDate: '2026-10-03',
  daysTotal: 28,
  daysLeft: 12,
};

const makeCategory = (
  overrides: Partial<CategoriesEntity> = {},
): CategoriesEntity =>
  ({
    id: 'cat-1',
    name: 'Еда',
    description: null,
    icon: null,
    color: '#16A34A',
    macroFund: MacroFund.ESSENTIALS,
    defaultLimit: '45000.00',
    rolloverToReserve: true,
    allowOverspendFromFund: false,
    workspaceId: WORKSPACE,
    ...overrides,
  }) as CategoriesEntity;

function setup({
  categories = [makeCategory()],
  cycle = bounds as CycleBounds | null,
  spentRows = [] as Array<{ categoryId: string; total: string; count: string }>,
} = {}) {
  const categoriesRepo = {
    findOneBy: jest.fn((where: Partial<CategoriesEntity>) =>
      Promise.resolve(
        categories.find((c) =>
          Object.entries(where).every(
            ([key, value]) => c[key as keyof CategoriesEntity] === value,
          ),
        ) ?? null,
      ),
    ),
    find: jest.fn(() => Promise.resolve(categories)),
    save: jest.fn((data: Partial<CategoriesEntity>) =>
      Promise.resolve({ id: 'cat-1', ...data }),
    ),
    update: jest.fn(() => Promise.resolve()),
  };

  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getRawMany = jest.fn(() => Promise.resolve(spentRows));
  const transitionRepo = { createQueryBuilder: jest.fn(() => qb) };

  const datasource = {
    getRepository: jest.fn((entity: unknown) =>
      entity === TransitionEntity ? transitionRepo : categoriesRepo,
    ),
  } as unknown as DataSource;

  const billingPeriodService = {
    getCurrentCycle: jest.fn(() => Promise.resolve(cycle)),
  } as unknown as BillingPeriodService;

  return {
    service: new CategoriesService(datasource, billingPeriodService),
    categoriesRepo,
    transitionRepo,
    qb,
  };
}

describe('CategoriesService', () => {
  describe('update', () => {
    it('PATCH с defaultLimit: null — сбрасывает лимит, остальное не трогает', async () => {
      const { service, categoriesRepo } = setup();

      await service.update({ id: 'cat-1', defaultLimit: null }, WORKSPACE);

      expect(categoriesRepo.update).toHaveBeenCalledWith('cat-1', {
        defaultLimit: null,
      });
    });

    it('PATCH без defaultLimit — лимит не попадает в update', async () => {
      const { service, categoriesRepo } = setup();

      await service.update({ id: 'cat-1', name: 'Продукты' }, WORKSPACE);

      expect(categoriesRepo.update).toHaveBeenCalledWith('cat-1', {
        name: 'Продукты',
      });
    });

    it('PATCH: null у color сбрасывает цвет, false у флага сохраняется', async () => {
      const { service, categoriesRepo } = setup();

      await service.update(
        { id: 'cat-1', color: null, rolloverToReserve: false },
        WORKSPACE,
      );

      expect(categoriesRepo.update).toHaveBeenCalledWith('cat-1', {
        color: null,
        rolloverToReserve: false,
      });
    });

    it('пустой PATCH — update в базу не вызывается', async () => {
      const { service, categoriesRepo } = setup();

      await service.update({ id: 'cat-1' }, WORKSPACE);

      expect(categoriesRepo.update).not.toHaveBeenCalled();
    });

    it('ответ — в формате элемента списка (с cycle)', async () => {
      const { service } = setup({
        spentRows: [{ categoryId: 'cat-1', total: '28450.00', count: '21' }],
      });

      const result = await service.update(
        { id: 'cat-1', defaultLimit: '45000.00' },
        WORKSPACE,
      );

      expect(result).toMatchObject({
        id: 'cat-1',
        color: '#16A34A',
        macroFund: 'essentials',
        defaultLimit: '45000.00',
        rolloverToReserve: true,
        allowOverspendFromFund: false,
        cycle: {
          ...bounds,
          spent: '28450.00',
          remaining: '16550.00',
          percent: 63,
          transactionCount: 21,
          status: 'ok',
        },
      });
    });

    it('чужая категория — ошибка', async () => {
      const { service } = setup();
      await expect(
        service.update({ id: 'cat-1', name: 'X' }, 'other-workspace'),
      ).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('сохраняет новые поля и возвращает категорию с cycle', async () => {
      const { service, categoriesRepo } = setup({ categories: [] });
      categoriesRepo.findOneBy
        .mockResolvedValueOnce(null) // проверка дубля имени
        .mockResolvedValueOnce(makeCategory()); // чтение после сохранения

      const result = await service.create(
        {
          name: 'Еда',
          macroFund: MacroFund.ESSENTIALS,
          color: '#16A34A',
          defaultLimit: '45000.00',
        },
        WORKSPACE,
      );

      expect(categoriesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Еда',
          macroFund: 'essentials',
          color: '#16A34A',
          defaultLimit: '45000.00',
          workspaceId: WORKSPACE,
        }),
      );
      expect(result.cycle).not.toBeNull();
    });
  });

  describe('getAll', () => {
    it('нет активного периода: cycle = null и запроса расходов нет', async () => {
      const { service, transitionRepo } = setup({ cycle: null });

      const result = await service.getAll(WORKSPACE);

      expect(result[0].cycle).toBeNull();
      expect(result[0].color).toBe('#16A34A');
      expect(transitionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('нет лимита: no_limit, расходы всё равно считаются', async () => {
      const { service } = setup({
        categories: [makeCategory({ defaultLimit: null })],
        spentRows: [{ categoryId: 'cat-1', total: '300.00', count: '2' }],
      });

      const [item] = await service.getAll(WORKSPACE);

      expect(item.cycle).toMatchObject({
        spent: '300.00',
        remaining: null,
        percent: null,
        transactionCount: 2,
        status: 'no_limit',
      });
    });

    it('лимит превышен: exceeded', async () => {
      const { service } = setup({
        categories: [makeCategory({ defaultLimit: '1000.00' })],
        spentRows: [{ categoryId: 'cat-1', total: '1500.00', count: '4' }],
      });

      const [item] = await service.getAll(WORKSPACE);

      expect(item.cycle).toMatchObject({
        remaining: '-500.00',
        percent: 150,
        status: 'exceeded',
      });
    });

    it('старая категория без цвета и макро-фонда: null как в базе', async () => {
      const { service } = setup({
        categories: [makeCategory({ color: null, macroFund: null })],
      });

      const [item] = await service.getAll(WORKSPACE);

      expect(item.color).toBeNull();
      expect(item.macroFund).toBeNull();
    });

    it('категория без расходов: "0.00"', async () => {
      const { service } = setup();

      const [item] = await service.getAll(WORKSPACE);

      expect(item.cycle).toMatchObject({
        spent: '0.00',
        transactionCount: 0,
        status: 'ok',
      });
    });

    it('расходы всех категорий — одним запросом, а не по запросу на категорию', async () => {
      const { service, transitionRepo, qb } = setup({
        categories: [
          makeCategory({ id: 'cat-1' }),
          makeCategory({ id: 'cat-2', name: 'Транспорт' }),
          makeCategory({ id: 'cat-3', name: 'Кафе' }),
        ],
        spentRows: [
          { categoryId: 'cat-1', total: '100.00', count: '1' },
          { categoryId: 'cat-3', total: '50.00', count: '2' },
        ],
      });

      const result = await service.getAll(WORKSPACE);

      expect(transitionRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
      expect(qb.groupBy).toHaveBeenCalledWith('t.categoryId');
      expect(result.map((c) => c.cycle?.spent)).toEqual([
        '100.00',
        '0.00',
        '50.00',
      ]);
    });
  });
});
