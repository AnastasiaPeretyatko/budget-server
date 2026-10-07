import { DataSource } from 'typeorm';
// Сущности циклически импортируют друг друга, поэтому tag.entity грузим первой
import './tag.entity';
import type { TagEntity } from './tag.entity';
import { TransitionEntity } from '../transition/transition.entity';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import { CycleBounds } from '../billing_period/utils/cycle-bounds';
import { TagsService } from './tags.service';
import { TagSort } from './types';

const WORKSPACE = 'ws-1';
const TODAY = '2026-10-06';

// Активный период: сегодня внутри него
const activeBounds: CycleBounds = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  daysTotal: 31,
  daysLeft: 26,
};

// Завершённый период: закончился до сегодня
const completedBounds: CycleBounds = {
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  daysTotal: 31,
  daysLeft: 0,
};

const makeTag = (overrides: Partial<TagEntity> = {}): TagEntity =>
  ({
    id: 'tag-1',
    name: 'семья',
    color: '#16A34A',
    workspaceId: WORKSPACE,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }) as TagEntity;

type StatsRow = { tagId: string; count: string; total?: string };

function setup({
  tags = [makeTag()],
  active = activeBounds as CycleBounds | null,
  byId = completedBounds as CycleBounds | null,
  statsRows = [] as StatsRow[],
  queryResults = [] as unknown[],
} = {}) {
  const tagsRepo = {
    findOneBy: jest.fn((where: Partial<TagEntity>) =>
      Promise.resolve(
        tags.find((t) =>
          Object.entries(where).every(
            ([key, value]) => t[key as keyof TagEntity] === value,
          ),
        ) ?? null,
      ),
    ),
    find: jest.fn((options?: { where?: { id?: unknown } }) => {
      // merge ищет теги по In([...]) — отдаём те, чьи id в списке
      const inIds = (options?.where?.id as { value?: string[] } | undefined)
        ?.value;
      return Promise.resolve(
        inIds ? tags.filter((t) => inIds.includes(t.id)) : tags,
      );
    }),
    save: jest.fn((data: Partial<TagEntity>) =>
      Promise.resolve({ id: 'tag-new', ...data }),
    ),
    update: jest.fn(() => Promise.resolve()),
    softDelete: jest.fn(() => Promise.resolve()),
  };

  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'setParameters',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getRawMany = jest.fn(() => Promise.resolve(statsRows));
  const transitionRepo = { createQueryBuilder: jest.fn(() => qb) };

  const query = jest.fn();
  for (const result of queryResults) query.mockResolvedValueOnce(result);

  const manager = {
    getRepository: jest.fn(() => tagsRepo),
    query,
  };

  const transaction = jest.fn((callback: (m: typeof manager) => unknown) =>
    Promise.resolve(callback(manager)),
  );
  const datasource = {
    getRepository: jest.fn((entity: unknown) =>
      entity === TransitionEntity ? transitionRepo : tagsRepo,
    ),
    transaction,
    query,
  } as unknown as DataSource;

  const getCurrentCycle = jest.fn(() => Promise.resolve(active));
  const getCycleById = jest.fn(() => Promise.resolve(byId));
  const billingPeriodService = {
    getCurrentCycle,
    getCycleById,
  } as unknown as BillingPeriodService;

  return {
    service: new TagsService(datasource, billingPeriodService),
    tagsRepo,
    qb,
    query,
    transaction,
    getCurrentCycle,
    getCycleById,
  };
}

const rejectsWith400 = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toMatchObject({ status: 400 });
};

describe('TagsService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 6, 12, 0, 0).getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create / update: имя', () => {
    it('«#Семья » сохраняется как «семья»', async () => {
      const { service, tagsRepo } = setup({ tags: [] });

      await service.create({ name: '#Семья ', color: '#16A34A' }, WORKSPACE);

      expect(tagsRepo.save).toHaveBeenCalledWith({
        name: 'семья',
        color: '#16A34A',
        workspaceId: WORKSPACE,
      });
    });

    it('пробелы внутри имени заменяются на «_»', async () => {
      const { service, tagsRepo } = setup({ tags: [] });

      await service.create({ name: 'Моя  Семья', color: '#16A34A' }, WORKSPACE);

      expect(tagsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'моя_семья' }),
      );
    });

    it('дубликат с другим регистром — 400', async () => {
      const { service, tagsRepo } = setup({
        tags: [makeTag({ name: 'Семья' })],
      });

      await rejectsWith400(
        service.create({ name: '#СЕМЬЯ', color: '#16A34A' }, WORKSPACE),
      );
      expect(tagsRepo.save).not.toHaveBeenCalled();
    });

    it('PATCH: имя нормализуется, дубликат с другим регистром — 400', async () => {
      const { service, tagsRepo } = setup({
        tags: [
          makeTag({ id: 'tag-1', name: 'еда' }),
          makeTag({ id: 'tag-2', name: 'Семья' }),
        ],
      });

      await rejectsWith400(
        service.update('tag-1', { name: ' #семья' }, WORKSPACE),
      );

      await service.update('tag-1', { name: ' #Продукты ' }, WORKSPACE);
      expect(tagsRepo.update).toHaveBeenCalledWith('tag-1', {
        name: 'продукты',
      });
    });

    it('PATCH: тег можно «переименовать» в самого себя с другим регистром', async () => {
      const { service, tagsRepo } = setup({
        tags: [makeTag({ id: 'tag-1', name: 'Семья' })],
      });

      await service.update('tag-1', { name: 'семья' }, WORKSPACE);

      expect(tagsRepo.update).toHaveBeenCalledWith('tag-1', { name: 'семья' });
    });

    it('пустой PATCH — update в базу не вызывается', async () => {
      const { service, tagsRepo } = setup();

      await service.update('tag-1', {}, WORKSPACE);

      expect(tagsRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll: статистика', () => {
    it('активный период по умолчанию: transactionCount и periodAmount', async () => {
      const { service, qb, getCurrentCycle, getCycleById } = setup({
        statsRows: [{ tagId: 'tag-1', count: '12', total: '86400' }],
      });

      const [tag] = await service.findAll(WORKSPACE);

      expect(getCurrentCycle).toHaveBeenCalled();
      expect(getCycleById).not.toHaveBeenCalled();
      expect(tag).toMatchObject({
        id: 'tag-1',
        transactionCount: 12,
        periodAmount: '86400.00',
        periodDays: 31,
      });
      // Активный период: до сегодня, а не до конца периода
      expect(qb.setParameters).toHaveBeenCalledWith({
        from: '2026-10-01',
        to: TODAY,
      });
    });

    it('выбранный завершённый период: берётся весь период, а не до сегодня', async () => {
      const { service, qb, getCurrentCycle, getCycleById } = setup({
        statsRows: [{ tagId: 'tag-1', count: '40', total: '1500.5' }],
      });

      const [tag] = await service.findAll(WORKSPACE, { periodId: 'period-1' });

      expect(getCycleById).toHaveBeenCalledWith(
        'period-1',
        WORKSPACE,
        expect.any(Date),
      );
      expect(getCurrentCycle).not.toHaveBeenCalled();
      expect(qb.setParameters).toHaveBeenCalledWith({
        from: '2026-08-01',
        to: '2026-08-31',
      });
      // transactionCount — за всё время, не зависит от периода
      expect(tag).toMatchObject({
        transactionCount: 40,
        periodAmount: '1500.50',
        periodDays: 31,
      });
    });

    it('период без конца: диапазон до сегодня, periodDays = null', async () => {
      const { service, qb } = setup({
        active: {
          startDate: '2026-09-15',
          endDate: null,
          daysTotal: null,
          daysLeft: null,
        },
        statsRows: [{ tagId: 'tag-1', count: '3', total: '300.00' }],
      });

      const [tag] = await service.findAll(WORKSPACE);

      expect(qb.setParameters).toHaveBeenCalledWith({
        from: '2026-09-15',
        to: TODAY,
      });
      expect(tag).toMatchObject({ periodAmount: '300.00', periodDays: null });
    });

    it('у тега нет транзакций: 0 и «0.00»', async () => {
      const { service } = setup({ statsRows: [] });

      const [tag] = await service.findAll(WORKSPACE);

      expect(tag).toMatchObject({
        transactionCount: 0,
        periodAmount: '0.00',
      });
    });

    it('периода нет совсем: periodAmount и periodDays = null, счётчик считается', async () => {
      const { service, qb } = setup({
        active: null,
        statsRows: [{ tagId: 'tag-1', count: '7' }],
      });

      const [tag] = await service.findAll(WORKSPACE);

      expect(tag).toMatchObject({
        transactionCount: 7,
        periodAmount: null,
        periodDays: null,
      });
      // сумма не запрашивается, диапазон не нужен
      expect(qb.setParameters).not.toHaveBeenCalled();
      expect(qb.addSelect).toHaveBeenCalledTimes(1);
    });

    it('чужой/несуществующий periodId — ошибка 400 из BillingPeriodService', async () => {
      const { service, getCycleById } = setup();
      getCycleById.mockRejectedValueOnce({ status: 400 });

      await rejectsWith400(service.findAll(WORKSPACE, { periodId: 'foreign' }));
    });

    it('статистика считается одним запросом на все теги', async () => {
      const { service, qb } = setup({
        tags: [
          makeTag({ id: 'tag-1' }),
          makeTag({ id: 'tag-2', name: 'работа' }),
          makeTag({ id: 'tag-3', name: 'отпуск' }),
        ],
      });

      await service.findAll(WORKSPACE);

      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith('tag.id IN (:...tagIds)', {
        tagIds: ['tag-1', 'tag-2', 'tag-3'],
      });
    });

    it('нет тегов — запрос статистики не выполняется', async () => {
      const { service, qb } = setup({ tags: [] });

      expect(await service.findAll(WORKSPACE)).toEqual([]);
      expect(qb.getRawMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll: сортировка', () => {
    const tags = [
      makeTag({ id: 'a', name: 'яблоки', createdAt: new Date('2026-03-01') }),
      makeTag({ id: 'b', name: 'арбуз', createdAt: new Date('2026-01-01') }),
      makeTag({ id: 'c', name: 'банан', createdAt: new Date('2026-02-01') }),
      makeTag({ id: 'd', name: 'вишня', createdAt: new Date('2026-04-01') }),
    ];
    const statsRows = [
      { tagId: 'a', count: '5' },
      { tagId: 'b', count: '5' },
      { tagId: 'c', count: '9' },
      // у d транзакций нет
    ];
    const ids = (list: Array<{ id: string }>) => list.map((t) => t.id);

    it('usage (по умолчанию): по убыванию transactionCount, при равенстве по имени', async () => {
      const { service } = setup({ tags, statsRows });

      expect(ids(await service.findAll(WORKSPACE))).toEqual([
        'c',
        'b',
        'a',
        'd',
      ]);
      expect(
        ids(await service.findAll(WORKSPACE, { sort: TagSort.USAGE })),
      ).toEqual(['c', 'b', 'a', 'd']);
    });

    it('name: по алфавиту', async () => {
      const { service } = setup({ tags, statsRows });

      expect(
        ids(await service.findAll(WORKSPACE, { sort: TagSort.NAME })),
      ).toEqual(['b', 'c', 'd', 'a']);
    });

    it('created: сначала новые', async () => {
      const { service } = setup({ tags, statsRows });

      expect(
        ids(await service.findAll(WORKSPACE, { sort: TagSort.CREATED })),
      ).toEqual(['d', 'a', 'c', 'b']);
    });
  });

  describe('merge', () => {
    const tags = [
      makeTag({ id: 'src-1', name: 'такси' }),
      makeTag({ id: 'src-2', name: 'taxi' }),
      makeTag({ id: 'target', name: 'транспорт' }),
    ];

    it.each([
      ['пустой sourceIds', { sourceIds: [], targetId: 'target' }],
      [
        'повторы в sourceIds',
        { sourceIds: ['src-1', 'src-1'], targetId: 'target' },
      ],
      [
        'targetId среди sourceIds',
        { sourceIds: ['src-1', 'target'], targetId: 'target' },
      ],
      [
        'тег не найден или из другого workspace',
        { sourceIds: ['src-1', 'foreign'], targetId: 'target' },
      ],
      [
        'целевой тег не найден или из другого workspace',
        { sourceIds: ['src-1'], targetId: 'foreign' },
      ],
    ])('%s — 400, в базе ничего не меняется', async (_name, dto) => {
      const { service, query, tagsRepo } = setup({ tags });

      await rejectsWith400(service.merge(dto, WORKSPACE));

      expect(query).not.toHaveBeenCalled();
      expect(tagsRepo.softDelete).not.toHaveBeenCalled();
    });

    it('переносит связи без дублей, удаляет исходные теги, всё в одной транзакции БД', async () => {
      const { service, query, tagsRepo, transaction } = setup({
        tags,
        statsRows: [{ tagId: 'target', count: '4', total: '900' }],
        // INSERT ... RETURNING (число новых связей), затем DELETE
        queryResults: [[{ count: 3 }], []],
      });

      const result = await service.merge(
        { sourceIds: ['src-1', 'src-2'], targetId: 'target' },
        WORKSPACE,
      );

      expect(transaction).toHaveBeenCalledTimes(1);

      const [insertSql, insertParams] = query.mock.calls[0] as [
        string,
        unknown[],
      ];
      // Уже существующая пара (транзакция, целевой тег) пропускается
      expect(insertSql).toContain('ON CONFLICT DO NOTHING');
      expect(insertParams).toEqual(['target', ['src-1', 'src-2']]);

      const [deleteSql, deleteParams] = query.mock.calls[1] as [
        string,
        unknown[],
      ];
      expect(deleteSql).toContain('DELETE FROM transaction_tags');
      expect(deleteParams).toEqual([['src-1', 'src-2']]);

      // Теги шаблонов переносятся так же, без дублей
      const [tplInsertSql, tplInsertParams] = query.mock.calls[2] as [
        string,
        unknown[],
      ];
      expect(tplInsertSql).toContain('INSERT INTO template_tags');
      expect(tplInsertSql).toContain('ON CONFLICT DO NOTHING');
      expect(tplInsertParams).toEqual(['target', ['src-1', 'src-2']]);
      const [tplDeleteSql, tplDeleteParams] = query.mock.calls[3] as [
        string,
        unknown[],
      ];
      expect(tplDeleteSql).toContain('DELETE FROM template_tags');
      expect(tplDeleteParams).toEqual([['src-1', 'src-2']]);

      expect(tagsRepo.softDelete).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        movedTransactions: 3,
        mergedTags: 2,
        tag: {
          id: 'target',
          name: 'транспорт',
          transactionCount: 4,
          periodAmount: '900.00',
          periodDays: 31,
        },
      });
    });

    it('если запрос в транзакции упал — исходные теги не удаляются', async () => {
      const { service, query, tagsRepo } = setup({ tags });
      query.mockRejectedValueOnce(new Error('db error'));

      await expect(
        service.merge({ sourceIds: ['src-1'], targetId: 'target' }, WORKSPACE),
      ).rejects.toThrow('db error');
      expect(tagsRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('возвращает удалённые id и их количество', async () => {
      const { service, query } = setup({
        queryResults: [[{ id: 'tag-2' }, { id: 'tag-5' }]],
      });

      expect(await service.cleanup(WORKSPACE)).toEqual({
        deletedCount: 2,
        deletedIds: ['tag-2', 'tag-5'],
      });

      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      // только свой workspace, только неудалённые теги,
      // и только те, у которых нет неудалённых транзакций
      expect(params).toEqual([WORKSPACE]);
      expect(sql).toContain('workspace_id = $1');
      expect(sql).toContain('deleted_at IS NULL');
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain('t.deleted_at IS NULL');
      // тег, который используется в шаблоне, не удаляется
      expect(sql).toContain('FROM template_tags');
      expect(sql).toContain('tp.deleted_at IS NULL');
    });

    it('неиспользуемых нет — пустой результат', async () => {
      const { service } = setup({ queryResults: [[]] });

      expect(await service.cleanup(WORKSPACE)).toEqual({
        deletedCount: 0,
        deletedIds: [],
      });
    });
  });
});
