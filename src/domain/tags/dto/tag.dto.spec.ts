import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTagDto } from './create-tag.dto';
import { UpdateTagDto } from './update-tag.dto';
import { GetAllTagsDto } from './get-all-tags.dto';
import { MergeTagsDto } from './merge-tags.dto';

const check = async <T extends object>(
  cls: new () => T,
  body: Record<string, unknown>,
) => {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, fields: errors.map((e) => e.property) };
};

const UUID_1 = '3f1c2a9e-5b7d-4c1a-9e2f-0a1b2c3d4e5f';
const UUID_2 = '8a7b6c5d-4e3f-4a2b-9c1d-0e1f2a3b4c5d';

describe('CreateTagDto', () => {
  const valid = { name: 'семья', color: '#16A34A' };

  it('«#Семья » приводится к «семья»', async () => {
    const { dto, fields } = await check(CreateTagDto, {
      ...valid,
      name: '#Семья ',
    });
    expect(fields).toEqual([]);
    expect(dto.name).toBe('семья');
  });

  it('пробелы внутри становятся «_»', async () => {
    const { dto, fields } = await check(CreateTagDto, {
      ...valid,
      name: 'Моя Семья',
    });
    expect(fields).toEqual([]);
    expect(dto.name).toBe('моя_семья');
  });

  it.each(['family-2026', 'a', 'Ёлка', 'x'.repeat(32)])(
    'допустимое имя: %s',
    async (name) => {
      expect((await check(CreateTagDto, { ...valid, name })).fields).toEqual(
        [],
      );
    },
  );

  it.each([
    ['пустое', ''],
    ['только пробелы и #', ' # '],
    ['33 символа', 'x'.repeat(33)],
    ['спецсимвол', 'семья!'],
    ['второй #', '##семья'],
    ['эмодзи', 'семья😀'],
    ['слэш', 'a/b'],
  ])('недопустимое имя (%s) — ошибка', async (_title, name) => {
    const { fields } = await check(CreateTagDto, { ...valid, name });
    expect(fields).toContain('name');
  });

  it('name не строка — ошибка', async () => {
    expect((await check(CreateTagDto, { ...valid, name: 5 })).fields).toContain(
      'name',
    );
  });

  it('color обязателен', async () => {
    expect((await check(CreateTagDto, { name: 'семья' })).fields).toContain(
      'color',
    );
  });

  it.each(['red', '#FFF', '16A34A', '#16A34A0', '#GGGGGG', ''])(
    'недопустимый цвет: %j',
    async (color) => {
      expect((await check(CreateTagDto, { ...valid, color })).fields).toContain(
        'color',
      );
    },
  );

  it('цвет #RRGGBB в любом регистре допустим', async () => {
    expect(
      (await check(CreateTagDto, { ...valid, color: '#aBcDeF' })).fields,
    ).toEqual([]);
  });
});

describe('UpdateTagDto', () => {
  it('пустое тело допустимо, name остаётся undefined', async () => {
    const { dto, fields } = await check(UpdateTagDto, {});
    expect(fields).toEqual([]);
    expect(dto.name).toBeUndefined();
  });

  it('имя нормализуется и валидируется так же, как при создании', async () => {
    const ok = await check(UpdateTagDto, { name: ' #Работа ' });
    expect(ok.fields).toEqual([]);
    expect(ok.dto.name).toBe('работа');

    expect((await check(UpdateTagDto, { name: 'a b!' })).fields).toContain(
      'name',
    );
  });

  it('цвет валидируется', async () => {
    expect((await check(UpdateTagDto, { color: '#16A34A' })).fields).toEqual(
      [],
    );
    expect((await check(UpdateTagDto, { color: 'green' })).fields).toContain(
      'color',
    );
  });
});

describe('GetAllTagsDto', () => {
  it('все параметры необязательны', async () => {
    expect((await check(GetAllTagsDto, {})).fields).toEqual([]);
  });

  it('periodId — uuid, sort — usage | name | created', async () => {
    expect(
      (await check(GetAllTagsDto, { periodId: UUID_1, sort: 'created' }))
        .fields,
    ).toEqual([]);
    expect((await check(GetAllTagsDto, { periodId: 'abc' })).fields).toContain(
      'periodId',
    );
    expect((await check(GetAllTagsDto, { sort: 'size' })).fields).toContain(
      'sort',
    );
  });
});

describe('MergeTagsDto', () => {
  it('принимает sourceIds и targetId', async () => {
    expect(
      (await check(MergeTagsDto, { sourceIds: [UUID_1], targetId: UUID_2 }))
        .fields,
    ).toEqual([]);
  });

  it.each([
    ['пустой массив', { sourceIds: [], targetId: UUID_2 }],
    ['повторы', { sourceIds: [UUID_1, UUID_1], targetId: UUID_2 }],
    ['не uuid в списке', { sourceIds: ['x'], targetId: UUID_2 }],
    ['не массив', { sourceIds: UUID_1, targetId: UUID_2 }],
    ['нет sourceIds', { targetId: UUID_2 }],
  ])('sourceIds: %s — ошибка', async (_title, body) => {
    expect((await check(MergeTagsDto, body)).fields).toContain('sourceIds');
  });

  it('targetId обязателен и должен быть uuid', async () => {
    expect(
      (await check(MergeTagsDto, { sourceIds: [UUID_1] })).fields,
    ).toContain('targetId');
    expect(
      (await check(MergeTagsDto, { sourceIds: [UUID_1], targetId: 'x' }))
        .fields,
    ).toContain('targetId');
  });
});
