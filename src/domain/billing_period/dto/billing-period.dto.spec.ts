import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBillingPeriodDto } from './create-billing-period.dto';
import { UpdateBillingPeriodDto } from './update-billing-period.dto';

const check = async <T extends object>(
  cls: new () => T,
  body: Record<string, unknown>,
) => {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((e) => e.property);
};

describe('CreateBillingPeriodDto', () => {
  it('обе даты — допустимо (так создаёт клиент)', async () => {
    expect(
      await check(CreateBillingPeriodDto, {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }),
    ).toEqual([]);
  });

  it('конец в тот же день, что и начало — допустимо', async () => {
    expect(
      await check(CreateBillingPeriodDto, {
        startDate: '2026-10-01',
        endDate: '2026-10-01',
      }),
    ).toEqual([]);
  });

  it('только startDay — допустимо', async () => {
    expect(await check(CreateBillingPeriodDto, { startDay: 7 })).toEqual([]);
  });

  it('конец раньше начала — ошибка', async () => {
    expect(
      await check(CreateBillingPeriodDto, {
        startDate: '2026-10-31',
        endDate: '2026-10-01',
      }),
    ).toContain('endDate');
  });

  it.each([0, 32, -1, 7.5, '7', null])('startDay = %j — ошибка', async (v) => {
    expect(await check(CreateBillingPeriodDto, { startDay: v })).toContain(
      'startDay',
    );
  });

  it.each([1, 31])('startDay = %d — граница допустима', async (v) => {
    expect(await check(CreateBillingPeriodDto, { startDay: v })).toEqual([]);
  });

  it('ни дат, ни startDay — ошибка', async () => {
    expect(await check(CreateBillingPeriodDto, {})).not.toEqual([]);
  });

  it('одна дата без startDay — ошибка', async () => {
    expect(
      await check(CreateBillingPeriodDto, { startDate: '2026-10-01' }),
    ).not.toEqual([]);
    expect(
      await check(CreateBillingPeriodDto, { endDate: '2026-10-31' }),
    ).not.toEqual([]);
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-1-1',
    '01.10.2026',
    '2026-10-01T00:00:00Z',
    'abc',
    '',
    20261001,
    null,
  ])('дата %j — ошибка', async (value) => {
    const fields = await check(CreateBillingPeriodDto, {
      startDate: value,
      endDate: '2026-12-31',
    });
    expect(fields).toContain('startDate');
  });

  it('29 февраля високосного года — реальная дата', async () => {
    expect(
      await check(CreateBillingPeriodDto, {
        startDate: '2028-02-29',
        endDate: '2028-03-31',
      }),
    ).toEqual([]);
  });

  it('лишние поля отклоняются', async () => {
    expect(
      await check(CreateBillingPeriodDto, { startDay: 7, status: 'completed' }),
    ).toContain('status');
  });
});

describe('UpdateBillingPeriodDto', () => {
  it('пустое тело допустимо', async () => {
    expect(await check(UpdateBillingPeriodDto, {})).toEqual([]);
  });

  it('status: completed допустим', async () => {
    expect(
      await check(UpdateBillingPeriodDto, { status: 'completed' }),
    ).toEqual([]);
  });

  it('переоткрыть период (status: active) нельзя', async () => {
    expect(await check(UpdateBillingPeriodDto, { status: 'active' })).toContain(
      'status',
    );
    expect(await check(UpdateBillingPeriodDto, { status: null })).toContain(
      'status',
    );
  });

  it('обе даты в теле: конец раньше начала — ошибка', async () => {
    expect(
      await check(UpdateBillingPeriodDto, {
        startDate: '2026-10-31',
        endDate: '2026-10-01',
      }),
    ).toContain('endDate');
  });

  it('одна дата допустима (вторая сравнивается в сервисе с текущим периодом)', async () => {
    expect(
      await check(UpdateBillingPeriodDto, { endDate: '2026-10-01' }),
    ).toEqual([]);
  });

  it.each([0, 32, null])('startDay = %j — ошибка', async (v) => {
    expect(await check(UpdateBillingPeriodDto, { startDay: v })).toContain(
      'startDay',
    );
  });

  it('даты проверяются на реальность', async () => {
    expect(
      await check(UpdateBillingPeriodDto, { startDate: '2026-02-30' }),
    ).toContain('startDate');
  });
});
