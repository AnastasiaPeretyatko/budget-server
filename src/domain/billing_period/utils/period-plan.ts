import { fromCents, toCents } from 'src/common/utils/money';
import { PlanSnapshotItem } from '../types';

export interface PlanCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  defaultLimit: string | null;
}

export interface Plan {
  planned: string;
  items: PlanSnapshotItem[];
}

// План по категориям с лимитом > 0 (лимит 0 считаем как «лимита нет»)
export function buildPlan(categories: PlanCategory[]): Plan {
  const items: PlanSnapshotItem[] = [];
  let totalCents = 0;

  for (const category of categories) {
    const limitCents =
      category.defaultLimit === null ? 0 : toCents(category.defaultLimit);
    if (limitCents <= 0) continue;

    totalCents += limitCents;
    items.push({
      categoryId: category.id,
      name: category.name,
      icon: category.icon ?? null,
      color: category.color ?? null,
      limit: fromCents(limitCents),
    });
  }

  return { planned: fromCents(totalCents), items };
}

// План закрытого периода из сохранённого снимка. null — снимка нет
// (период закрыт до его появления), значит и плана нет.
export function buildSnapshotPlan(period: {
  plannedAmount: string | null;
  planSnapshot: PlanSnapshotItem[] | null;
}): Plan | null {
  if (!period.planSnapshot) return null;

  return {
    planned:
      period.plannedAmount ??
      buildPlan(
        period.planSnapshot.map((item) => ({
          id: item.categoryId,
          name: item.name,
          icon: item.icon,
          color: item.color,
          defaultLimit: item.limit,
        })),
      ).planned,
    items: period.planSnapshot,
  };
}
