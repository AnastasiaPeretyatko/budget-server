import { fromCents, toCents } from 'src/common/utils/money';
import { BillingPeriodStatus } from '../billing_period.entity';
import {
  BillingPeriodHistoryItem,
  BillingPeriodResult,
  BillingPeriodSummary,
  BillingPeriodSummaryCategory,
} from '../types';
import { CycleBounds } from './cycle-bounds';
import { Plan } from './period-plan';

// Расходы за цикл по категориям. categoryId = null — расходы без категории
export interface SpentRow {
  categoryId: string | null;
  total: string;
}

export interface CategoryInfo {
  name: string;
  icon: string | null;
  color: string | null;
}

export interface SummaryInput {
  period: { id: string; status: BillingPeriodStatus; startDay: number | null };
  bounds: CycleBounds;
  // null — плана нет (завершённый период без снимка)
  plan: Plan | null;
  spentRows: SpentRow[];
  // Данные категорий, по которым были расходы, но которых нет в плане
  categoryInfo: Map<string, CategoryInfo>;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'ru');

// Math.round(-0.4) даёт -0 — приводим к обычному нулю
const round = (value: number): number => Math.round(value) || 0;

export function buildSummary({
  period,
  bounds,
  plan,
  spentRows,
  categoryInfo,
}: SummaryInput): BillingPeriodSummary {
  const { daysTotal, daysLeft } = bounds;
  const daysPassed =
    daysTotal === null
      ? null
      : Math.min(daysTotal, Math.max(0, daysTotal - (daysLeft ?? 0)));

  // Расходы: всего, без категории и по каждой категории (в копейках)
  let spentCents = 0;
  let uncategorizedCents = 0;
  const spentByCategory = new Map<string, number>();
  for (const row of spentRows) {
    const cents = toCents(row.total);
    spentCents += cents;
    if (row.categoryId === null) uncategorizedCents += cents;
    else
      spentByCategory.set(
        row.categoryId,
        (spentByCategory.get(row.categoryId) ?? 0) + cents,
      );
  }

  const plannedCents = plan ? toCents(plan.planned) : null;
  // План 0 считаем как «плана нет»
  const hasPlan = plannedCents !== null && plannedCents > 0;

  const planItems = new Map((plan?.items ?? []).map((i) => [i.categoryId, i]));
  const categoryIds = new Set([...planItems.keys(), ...spentByCategory.keys()]);

  const categories: BillingPeriodSummaryCategory[] = [];
  for (const categoryId of categoryIds) {
    const item = planItems.get(categoryId);
    const info = item ?? categoryInfo.get(categoryId);
    const categorySpent = spentByCategory.get(categoryId) ?? 0;
    const limitCents = item ? toCents(item.limit) : null;

    categories.push({
      categoryId,
      name: info?.name ?? '',
      icon: info?.icon ?? null,
      color: info?.color ?? null,
      planned: limitCents === null ? null : fromCents(limitCents),
      spent: fromCents(categorySpent),
      delta: limitCents === null ? null : fromCents(limitCents - categorySpent),
    });
  }
  // Больше расходов — выше; при равенстве по имени
  categories.sort(
    (a, b) => toCents(b.spent) - toCents(a.spent) || byName(a, b),
  );

  const isActive = period.status === BillingPeriodStatus.ACTIVE;

  // Сегодняшний день считаем прошедшим: расходы за него уже в spent
  const elapsedDays =
    daysTotal !== null && daysTotal > 0 && daysPassed !== null
      ? Math.min(daysTotal, daysPassed + 1)
      : null;

  let pace: BillingPeriodSummary['pace'] = null;
  let forecast: BillingPeriodSummary['forecast'] = null;

  if (isActive) {
    const expectedCents =
      hasPlan && elapsedDays !== null && daysTotal !== null
        ? Math.round((plannedCents * elapsedDays) / daysTotal)
        : null;
    const forecastCents =
      elapsedDays !== null && daysTotal !== null
        ? Math.round((spentCents / elapsedDays) * daysTotal)
        : null;

    pace = {
      expectedSpent: expectedCents === null ? null : fromCents(expectedCents),
      deltaPercent: expectedCents
        ? round(((spentCents - expectedCents) / expectedCents) * 100)
        : null,
    };
    forecast = {
      spent: forecastCents === null ? null : fromCents(forecastCents),
      balance:
        hasPlan && forecastCents !== null
          ? fromCents(plannedCents - forecastCents)
          : null,
    };
  }

  return {
    period: {
      id: period.id,
      status: period.status,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      startDay: period.startDay,
      daysTotal,
      daysLeft,
      daysPassed,
    },
    planned: plannedCents === null ? null : fromCents(plannedCents),
    plannedCategories: plan?.items.length ?? 0,
    spent: fromCents(spentCents),
    delta: hasPlan ? fromCents(plannedCents - spentCents) : null,
    pace,
    forecast,
    uncategorizedSpent: fromCents(uncategorizedCents),
    categories,
  };
}

export function buildHistoryItem(
  period: { id: string; plannedAmount: string | null },
  bounds: CycleBounds & { endDate: string },
  spent: string,
): BillingPeriodHistoryItem {
  const plannedCents =
    period.plannedAmount === null ? null : toCents(period.plannedAmount);
  const hasPlan = plannedCents !== null && plannedCents > 0;
  const deltaCents = hasPlan ? plannedCents - toCents(spent) : null;

  let result: BillingPeriodResult = 'no_plan';
  if (deltaCents !== null) result = deltaCents >= 0 ? 'success' : 'overspent';

  return {
    id: period.id,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    daysTotal: bounds.daysTotal,
    planned: plannedCents === null ? null : fromCents(plannedCents),
    spent: fromCents(toCents(spent)),
    delta: deltaCents === null ? null : fromCents(deltaCents),
    result,
  };
}
