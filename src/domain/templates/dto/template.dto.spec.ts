import 'reflect-metadata';
// Сущности циклически импортируют друг друга, поэтому tag.entity грузим первой
import '../../tags/tag.entity';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTemplateDto } from './create-template.dto';
import { UpdateTemplateDto } from './update-template.dto';

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

describe('CreateTemplateDto', () => {
  const valid = {
    name: 'Кофе',
    icon: 'Coffee',
    amount: '250',
    type: 'expense',
  };

  it('минимальный набор допустим, tagIds необязателен', async () => {
    const { dto, fields } = await check(CreateTemplateDto, valid);
    expect(fields).toEqual([]);
    expect(dto.tagIds).toBeUndefined();
  });

  it('tagIds: массив uuid без повторов', async () => {
    expect(
      (await check(CreateTemplateDto, { ...valid, tagIds: [UUID_1, UUID_2] }))
        .fields,
    ).toEqual([]);
    expect(
      (await check(CreateTemplateDto, { ...valid, tagIds: [] })).fields,
    ).toEqual([]);
  });

  it.each([
    ['повторы', [UUID_1, UUID_1]],
    ['не uuid', ['x']],
    ['не массив', UUID_1],
  ])('tagIds: %s — ошибка', async (_title, tagIds) => {
    expect(
      (await check(CreateTemplateDto, { ...valid, tagIds })).fields,
    ).toContain('tagIds');
  });

  it('categoryId и счета должны быть uuid', async () => {
    const { fields } = await check(CreateTemplateDto, {
      ...valid,
      categoryId: 'abc',
      fromAccountId: 'abc',
      toAccountId: UUID_1,
    });
    expect(fields).toEqual(
      expect.arrayContaining(['categoryId', 'fromAccountId']),
    );
    expect(fields).not.toContain('toAccountId');
  });
});

describe('UpdateTemplateDto', () => {
  it('пустое тело допустимо: частичный PATCH возможен', async () => {
    expect((await check(UpdateTemplateDto, {})).fields).toEqual([]);
  });

  it('можно менять только имя и иконку', async () => {
    expect(
      (await check(UpdateTemplateDto, { name: 'Новое', icon: 'Star' })).fields,
    ).toEqual([]);
  });

  it('счета, категорию и описание можно сбросить (null)', async () => {
    const { dto, fields } = await check(UpdateTemplateDto, {
      fromAccountId: null,
      toAccountId: null,
      categoryId: null,
      description: null,
    });
    expect(fields).toEqual([]);
    expect(dto.categoryId).toBeNull();
  });

  it('name, icon, amount, type, tagIds сбросить в null нельзя (колонки NOT NULL)', async () => {
    const { fields } = await check(UpdateTemplateDto, {
      name: null,
      icon: null,
      amount: null,
      type: null,
      tagIds: null,
    });
    expect(fields).toEqual(
      expect.arrayContaining(['name', 'icon', 'amount', 'type', 'tagIds']),
    );
  });

  it('tagIds: [] допустим (убрать все теги), повторы и не-uuid — нет', async () => {
    expect((await check(UpdateTemplateDto, { tagIds: [] })).fields).toEqual([]);
    expect(
      (await check(UpdateTemplateDto, { tagIds: [UUID_1, UUID_1] })).fields,
    ).toContain('tagIds');
    expect(
      (await check(UpdateTemplateDto, { tagIds: ['x'] })).fields,
    ).toContain('tagIds');
  });

  it('amount с запятой нормализуется, мусор — ошибка', async () => {
    const ok = await check(UpdateTemplateDto, { amount: '10,5' });
    expect(ok.fields).toEqual([]);
    expect(ok.dto.amount).toBe('10.5');
    expect(
      (await check(UpdateTemplateDto, { amount: 'abc' })).fields,
    ).toContain('amount');
  });
});
