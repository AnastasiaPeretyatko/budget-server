import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

interface PeriodFields {
  startDate?: unknown;
  endDate?: unknown;
  startDay?: unknown;
}

// «YYYY-MM-DD» и реальная дата: 2026-02-30 не проходит
export const isRealDate = (value: unknown): boolean => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;

  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
};

// Поле необязательное: undefined допустим, null и всё остальное — нет
export function IsRealDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isRealDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid date in YYYY-MM-DD format`,
        ...options,
      },
      validator: {
        validate: (value: unknown) => value === undefined || isRealDate(value),
      },
    });
}

// Если переданы обе даты, конец не раньше начала
// (даты «YYYY-MM-DD» сравниваются как строки)
export function IsEndNotBeforeStart(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isEndNotBeforeStart',
      target: object.constructor,
      propertyName,
      options: {
        message: 'endDate must not be earlier than startDate',
        ...options,
      },
      validator: {
        validate: (_: unknown, args: ValidationArguments) => {
          const { startDate, endDate } = args.object as PeriodFields;
          if (!isRealDate(startDate) || !isRealDate(endDate)) return true;
          return (endDate as string) >= (startDate as string);
        },
      },
    });
}

// Период задаётся либо обеими датами, либо числом месяца (startDay)
export function IsPeriodShape(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isPeriodShape',
      target: object.constructor,
      propertyName,
      options: {
        message: 'Either startDate and endDate, or startDay is required',
        ...options,
      },
      validator: {
        validate: (_: unknown, args: ValidationArguments) => {
          const { startDate, endDate, startDay } = args.object as PeriodFields;
          const hasDates = startDate !== undefined && endDate !== undefined;
          return hasDates || startDay !== undefined;
        },
      },
    });
}
