import { fromCents, toCents } from 'src/common/utils/money';
import { CycleBounds } from '../../billing_period/utils/cycle-bounds';

// С этого процента расхода от лимита статус становится warning
export const WARNING_THRESHOLD_PERCENT = 80;

export type CategoryCycleStatus = 'no_limit' | 'ok' | 'warning' | 'exceeded';

export interface CategorySpent {
  total: string;
  count: number;
}

export interface CategoryCycle extends CycleBounds {
  spent: string;
  remaining: string | null;
  percent: number | null;
  transactionCount: number;
  status: CategoryCycleStatus;
}

export const getStatus = (percent: number | null): CategoryCycleStatus => {
  if (percent === null) return 'no_limit';
  if (percent > 100) return 'exceeded';
  if (percent >= WARNING_THRESHOLD_PERCENT) return 'warning';
  return 'ok';
};

export function buildCategoryCycle(
  bounds: CycleBounds,
  defaultLimit: string | null,
  spent: CategorySpent | undefined,
): CategoryCycle {
  const spentCents = toCents(spent?.total ?? '0');
  const limitCents = defaultLimit === null ? 0 : toCents(defaultLimit);
  // Лимит 0 считаем как «лимита нет»
  const hasLimit = limitCents > 0;

  const percent = hasLimit ? Math.round((spentCents / limitCents) * 100) : null;

  return {
    ...bounds,
    spent: fromCents(spentCents),
    remaining: hasLimit ? fromCents(limitCents - spentCents) : null,
    percent,
    transactionCount: spent?.count ?? 0,
    status: getStatus(percent),
  };
}
