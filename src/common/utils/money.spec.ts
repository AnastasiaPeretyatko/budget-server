import { fromCents, toCents } from './money';

describe('money', () => {
  it.each([
    ['0', 0],
    ['1500.00', 150000],
    ['0.07', 7],
    ['19.99', 1999],
    ['-12.5', -1250],
  ])('toCents(%s) = %d', (value, cents) => {
    expect(toCents(value)).toBe(cents);
  });

  it.each([
    [0, '0.00'],
    [150000, '1500.00'],
    [7, '0.07'],
    [-1250, '-12.50'],
    [-5, '-0.05'],
  ])('fromCents(%d) = %s', (cents, value) => {
    expect(fromCents(cents)).toBe(value);
  });
});
