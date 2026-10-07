// Категория с лимитом на момент закрытия цикла
export interface PlanSnapshotItem {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  limit: string;
}

export interface BillingPeriodSummaryCategory {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  planned: string | null;
  spent: string;
  delta: string | null;
}

export interface BillingPeriodSummary {
  period: {
    id: string;
    status: string;
    startDate: string;
    endDate: string | null;
    startDay: number | null;
    daysTotal: number | null;
    daysLeft: number | null;
    daysPassed: number | null;
  };
  planned: string | null;
  plannedCategories: number;
  spent: string;
  delta: string | null;
  pace: { expectedSpent: string | null; deltaPercent: number | null } | null;
  forecast: { spent: string | null; balance: string | null } | null;
  uncategorizedSpent: string;
  categories: BillingPeriodSummaryCategory[];
}

export type BillingPeriodResult = 'success' | 'overspent' | 'no_plan';

export interface BillingPeriodHistoryItem {
  id: string;
  startDate: string;
  endDate: string;
  daysTotal: number | null;
  planned: string | null;
  spent: string;
  delta: string | null;
  result: BillingPeriodResult;
}
