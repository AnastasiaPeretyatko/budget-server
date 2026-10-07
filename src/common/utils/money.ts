// Деньги считаем в копейках (целые числа), чтобы не ловить ошибки дробей
export const toCents = (value: string): number =>
  Math.round(Number(value) * 100);

export const fromCents = (cents: number): string => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};
