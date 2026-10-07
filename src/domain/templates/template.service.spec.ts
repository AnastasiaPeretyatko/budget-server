import { DataSource } from 'typeorm';
// Сущности циклически импортируют друг друга, поэтому tag.entity грузим первой
import '../tags/tag.entity';
import { TagsService } from '../tags/tags.service';
import { TemplateEntity } from './template.entity';
import { TemplateServise } from './template.service';

const WORKSPACE = 'ws-1';

type Tpl = Record<string, unknown> & { id: string; workspaceId: string };

const makeTemplate = (overrides: Partial<Tpl> = {}): Tpl => ({
  id: 'tpl-1',
  name: 'Кофе',
  workspaceId: WORKSPACE,
  tags: [],
  ...overrides,
});

const makeTag = (id: string) => ({ id, name: id, workspaceId: WORKSPACE });

function setup({
  templates = [makeTemplate()],
  knownTags = ['tag-1', 'tag-2'],
} = {}) {
  const findOne = jest.fn(
    (options: { where: { id: string; workspaceId: string } }) =>
      Promise.resolve(
        templates.find(
          (t) =>
            t.id === options.where.id &&
            t.workspaceId === options.where.workspaceId,
        ) ?? null,
      ),
  );
  const findAndCount = jest.fn(() =>
    Promise.resolve([templates, templates.length]),
  );
  const save = jest.fn((data: Record<string, unknown>) =>
    Promise.resolve({ id: 'tpl-new', ...data }),
  );
  const remove = jest.fn(() => Promise.resolve());
  const repo = { findOne, findAndCount, save, delete: remove };

  const datasource = {
    getRepository: jest.fn(() => repo),
  } as unknown as DataSource;

  const findByIds = jest.fn((ids: string[], workspaceId: string) =>
    Promise.resolve(
      ids.filter((id) => knownTags.includes(id)).map(makeTag),
    ).then((tags) => (workspaceId === WORKSPACE ? tags : [])),
  );
  const tagsService = { findByIds } as unknown as TagsService;

  return {
    service: new TemplateServise(datasource, tagsService),
    findOne,
    findAndCount,
    save,
    remove,
    findByIds,
  };
}

const rejectsWith400 = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toMatchObject({ status: 400 });
};

const createDto = {
  name: 'Кофе',
  icon: 'Coffee',
  amount: '250',
  type: 'expense' as TemplateEntity['type'],
  fromAccountId: null,
  toAccountId: null,
  categoryId: null,
};

describe('TemplateServise', () => {
  describe('ответ: категория, счета и теги — всегда', () => {
    it('шаблон читается со всеми связями (и в списке, и по id)', async () => {
      const { service, findOne, findAndCount } = setup();

      await service.getOne('tpl-1', WORKSPACE);
      await service.findAll(WORKSPACE, {
        limit: 10,
        page: 1,
        order: 'DESC',
      });

      const relations = {
        fromAccount: true,
        toAccount: true,
        category: true,
        tags: true,
      };
      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations }),
      );
      expect(findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ relations }),
      );
    });

    it('create отдаёт шаблон в том же формате (читает заново со связями)', async () => {
      const { service, findOne } = setup({
        templates: [makeTemplate({ id: 'tpl-new', tags: [makeTag('tag-1')] })],
      });

      const result = await service.create(
        { ...createDto, tagIds: ['tag-1'] },
        WORKSPACE,
      );

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tpl-new', workspaceId: WORKSPACE },
          relations: {
            fromAccount: true,
            toAccount: true,
            category: true,
            tags: true,
          },
        }),
      );
      expect(result).toMatchObject({ id: 'tpl-new', tags: [{ id: 'tag-1' }] });
    });
  });

  describe('create: теги', () => {
    it('теги сохраняются вместе с шаблоном, tagIds в сущность не попадает', async () => {
      const { service, save } = setup({
        templates: [makeTemplate({ id: 'tpl-new' })],
      });

      await service.create(
        { ...createDto, tagIds: ['tag-1', 'tag-2'] },
        WORKSPACE,
      );

      const saved = save.mock.calls[0][0];
      expect(saved).toMatchObject({
        name: 'Кофе',
        workspaceId: WORKSPACE,
        tags: [{ id: 'tag-1' }, { id: 'tag-2' }],
      });
      expect(saved).not.toHaveProperty('tagIds');
    });

    it('без тегов (undefined или null) — пустой список, запрос тегов не делается', async () => {
      const { service, save, findByIds } = setup({
        templates: [makeTemplate({ id: 'tpl-new' })],
      });

      await service.create(createDto, WORKSPACE);
      await service.create({ ...createDto, tagIds: null }, WORKSPACE);

      expect(save.mock.calls[0][0]).toMatchObject({ tags: [] });
      expect(save.mock.calls[1][0]).toMatchObject({ tags: [] });
      expect(findByIds).not.toHaveBeenCalled();
    });

    it('неизвестный или чужой тег — 400, шаблон не создаётся', async () => {
      const { service, save } = setup();

      await rejectsWith400(
        service.create(
          { ...createDto, tagIds: ['tag-1', 'foreign'] },
          WORKSPACE,
        ),
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('теги ищутся в workspace шаблона', async () => {
      const { service, findByIds } = setup({
        templates: [makeTemplate({ id: 'tpl-new' })],
      });

      await service.create({ ...createDto, tagIds: ['tag-1'] }, WORKSPACE);

      expect(findByIds).toHaveBeenCalledWith(['tag-1'], WORKSPACE);
    });
  });

  describe('update', () => {
    it('меняет только переданные поля; теги не трогает, если tagIds не передан', async () => {
      const { service, save } = setup();

      await service.update('tpl-1', { name: 'Новое' }, WORKSPACE);

      expect(save).toHaveBeenCalledWith({ id: 'tpl-1', name: 'Новое' });
      expect(save.mock.calls[0][0]).not.toHaveProperty('tags');
    });

    it('null сбрасывает категорию, undefined — не трогает', async () => {
      const { service, save } = setup();

      await service.update(
        'tpl-1',
        { categoryId: null, description: undefined },
        WORKSPACE,
      );

      expect(save).toHaveBeenCalledWith({ id: 'tpl-1', categoryId: null });
    });

    it('tagIds заменяет теги, [] убирает все', async () => {
      const { service, save } = setup();

      await service.update('tpl-1', { tagIds: ['tag-2'] }, WORKSPACE);
      await service.update('tpl-1', { tagIds: [] }, WORKSPACE);

      expect(save.mock.calls[0][0]).toEqual({
        id: 'tpl-1',
        tags: [expect.objectContaining({ id: 'tag-2' })],
      });
      expect(save.mock.calls[1][0]).toEqual({ id: 'tpl-1', tags: [] });
    });

    it('пустой PATCH — запись в базу не идёт', async () => {
      const { service, save } = setup();

      await service.update('tpl-1', {}, WORKSPACE);

      expect(save).not.toHaveBeenCalled();
    });

    it('неизвестный тег — 400, ничего не меняется', async () => {
      const { service, save } = setup();

      await rejectsWith400(
        service.update('tpl-1', { name: 'X', tagIds: ['foreign'] }, WORKSPACE),
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('возвращает обновлённый шаблон, а не результат update', async () => {
      const { service } = setup();

      expect(
        await service.update('tpl-1', { name: 'X' }, WORKSPACE),
      ).toMatchObject({ id: 'tpl-1' });
    });
  });

  describe('шаблон чужого workspace или несуществующий', () => {
    it('getOne / update / archive — 400', async () => {
      const { service, save, remove } = setup();

      await rejectsWith400(service.getOne('tpl-1', 'other-ws'));
      await rejectsWith400(service.getOne('missing', WORKSPACE));
      await rejectsWith400(service.update('tpl-1', { name: 'X' }, 'other-ws'));
      await rejectsWith400(service.archive('tpl-1', 'other-ws'));
      await rejectsWith400(service.archive('missing', WORKSPACE));

      expect(save).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    it('findOneByPk возвращает null (для сценария «транзакция из шаблона»)', async () => {
      const { service } = setup();

      expect(await service.findOneByPk('tpl-1', 'other-ws')).toBeNull();
    });
  });

  it('archive удаляет свой шаблон', async () => {
    const { service, remove } = setup();

    expect(await service.archive('tpl-1', WORKSPACE)).toEqual({
      message: 'Шаблон был удален',
    });
    expect(remove).toHaveBeenCalledWith('tpl-1');
  });
});
