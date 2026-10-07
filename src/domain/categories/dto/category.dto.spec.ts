import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update-category.dto';

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

describe('CreateCategoryDto', () => {
  const valid = { name: 'Еда', macroFund: 'essentials' };

  it('принимает минимальный набор: name + macroFund', async () => {
    expect((await check(CreateCategoryDto, valid)).fields).toEqual([]);
  });

  it('macroFund обязателен', async () => {
    const { fields } = await check(CreateCategoryDto, { name: 'Еда' });
    expect(fields).toContain('macroFund');
  });

  it('macroFund только из списка', async () => {
    const { fields } = await check(CreateCategoryDto, {
      ...valid,
      macroFund: 'other',
    });
    expect(fields).toContain('macroFund');
  });

  it('флаги не принимают null (колонки NOT NULL)', async () => {
    const { fields } = await check(CreateCategoryDto, {
      ...valid,
      rolloverToReserve: null,
      allowOverspendFromFund: null,
    });
    expect(fields).toEqual(
      expect.arrayContaining(['rolloverToReserve', 'allowOverspendFromFund']),
    );
  });
});

describe('UpdateCategoryDto', () => {
  it('пустое тело допустимо', async () => {
    expect((await check(UpdateCategoryDto, {})).fields).toEqual([]);
  });

  it('defaultLimit: null допустим (сброс лимита)', async () => {
    const { dto, fields } = await check(UpdateCategoryDto, {
      defaultLimit: null,
    });
    expect(fields).toEqual([]);
    expect(dto.defaultLimit).toBeNull();
  });

  it('без defaultLimit поле остаётся undefined, а не null (сервис такое не меняет)', async () => {
    const { dto } = await check(UpdateCategoryDto, { name: 'Еда' });
    expect(dto.defaultLimit).toBeUndefined();
  });

  it('defaultLimit: запятая заменяется на точку', async () => {
    const { dto, fields } = await check(UpdateCategoryDto, {
      defaultLimit: '45000,50',
    });
    expect(fields).toEqual([]);
    expect(dto.defaultLimit).toBe('45000.50');
  });

  it.each(['-1', 'abc', '10.123', '', '1e5'])(
    'defaultLimit %p отклоняется',
    async (value) => {
      const { fields } = await check(UpdateCategoryDto, {
        defaultLimit: value,
      });
      expect(fields).toContain('defaultLimit');
    },
  );

  it('defaultLimit: 0 допустим', async () => {
    expect(
      (await check(UpdateCategoryDto, { defaultLimit: '0' })).fields,
    ).toEqual([]);
  });

  it('color: null допустим (сброс цвета)', async () => {
    expect((await check(UpdateCategoryDto, { color: null })).fields).toEqual(
      [],
    );
  });

  it.each(['#16A34A', '#abcdef'])('color %p допустим', async (color) => {
    expect((await check(UpdateCategoryDto, { color })).fields).toEqual([]);
  });

  it.each(['16A34A', '#fff', '#16A34', 'red', '#GGGGGG'])(
    'color %p отклоняется',
    async (color) => {
      expect((await check(UpdateCategoryDto, { color })).fields).toContain(
        'color',
      );
    },
  );

  it('macroFund: null нельзя', async () => {
    expect(
      (await check(UpdateCategoryDto, { macroFund: null })).fields,
    ).toContain('macroFund');
  });

  it('macroFund можно сменить на другое значение', async () => {
    expect(
      (await check(UpdateCategoryDto, { macroFund: 'savings' })).fields,
    ).toEqual([]);
  });

  it('флаги: null нельзя, boolean можно', async () => {
    expect(
      (await check(UpdateCategoryDto, { rolloverToReserve: null })).fields,
    ).toContain('rolloverToReserve');
    expect(
      (await check(UpdateCategoryDto, { allowOverspendFromFund: false }))
        .fields,
    ).toEqual([]);
  });
});
