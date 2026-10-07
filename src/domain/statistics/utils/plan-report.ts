import { fromCents, toCents } from 'src/common/utils/money';
import { Plan } from '../../billing_period/utils/period-plan';
import { MacroFund } from '../../categories/types';
import { getStatus } from '../../categories/utils/category-cycle';
import {
  PlanCategoryItem,
  PlanDiscipline,
  PlanFundItem,
  PlanTagSlice,
  PlanTimelinePoint,
} from '../dto';

export interface ReportPeriod {
  id: string;
  from: string;
  to: string;
  plan: Plan | null;
}

export interface CategoryMeta {
  name: string;
  icon: string | null;
  color: string | null;
  macroFund: MacroFund | null;
}

// Расходы цикла по категории. categoryId = null — расходы без категории
export interface PeriodSpentRow {
  periodId: string;
  categoryId: string | null;
  total: string;
}

export interface PlanReportInput {
  periods: ReportPeriod[];
  spentRows: PeriodSpentRow[];
  // Все категории workspace, в том числе удалённые
  categoryMeta: Map<string, CategoryMeta>;
}

export interface PlanReport {
  planned: string;
  spent: string;
  discipline: PlanDiscipline;
  categories: PlanCategoryItem[];
  unassignedSpent: string;
  funds: PlanFundItem[];
  // По одной точке на цикл, в порядке periods
  periodPoints: PlanTimelinePoint[];
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'ru');

const sum = (values: number[]): number =>
  values.reduce((acc, value) => acc + value, 0);

// Доля в процентах с одним знаком; null — делить не на что
const share = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;

export function buildPlanReport({
  periods,
  spentRows,
  categoryMeta,
}: PlanReportInput): PlanReport {
  // План: всего и по каждому конверту (в копейках)
  let plannedCents = 0;
  const plannedByCategory = new Map<string, number>();
  // Данные конверта из снимка — на случай, если категории уже нет в базе
  const snapshotInfo = new Map<string, CategoryMeta>();
  for (const period of periods) {
    if (!period.plan) continue;

    plannedCents += toCents(period.plan.planned);
    for (const item of period.plan.items) {
      plannedByCategory.set(
        item.categoryId,
        (plannedByCategory.get(item.categoryId) ?? 0) + toCents(item.limit),
      );
      snapshotInfo.set(item.categoryId, {
        name: item.name,
        icon: item.icon,
        color: item.color,
        macroFund: null,
      });
    }
  }

  // Факт: всего, по конвертам и по циклам
  let spentCents = 0;
  const spentByCategory = new Map<string, number>();
  const spentByPeriod = new Map<string, number>();
  for (const row of spentRows) {
    const cents = toCents(row.total);
    spentCents += cents;
    spentByPeriod.set(
      row.periodId,
      (spentByPeriod.get(row.periodId) ?? 0) + cents,
    );
    if (row.categoryId !== null) {
      spentByCategory.set(
        row.categoryId,
        (spentByCategory.get(row.categoryId) ?? 0) + cents,
      );
    }
  }

  const categoryIds = new Set([
    ...plannedByCategory.keys(),
    ...spentByCategory.keys(),
  ]);

  const categories: PlanCategoryItem[] = [];
  for (const categoryId of categoryIds) {
    const meta = categoryMeta.get(categoryId) ?? snapshotInfo.get(categoryId);
    const planned = plannedByCategory.get(categoryId) ?? 0;
    const spent = spentByCategory.get(categoryId) ?? 0;
    // Лимит 0 считаем как «лимита нет»
    const hasLimit = planned > 0;
    const percent = hasLimit ? Math.round((spent / planned) * 100) : null;

    categories.push({
      categoryId,
      name: meta?.name ?? '',
      icon: meta?.icon ?? null,
      color: meta?.color ?? null,
      macroFund: categoryMeta.get(categoryId)?.macroFund ?? null,
      planned: hasLimit ? fromCents(planned) : null,
      spent: fromCents(spent),
      percent,
      status: getStatus(percent),
    });
  }
  // Больше расходов — выше; при равенстве по имени
  categories.sort(
    (a, b) => toCents(b.spent) - toCents(a.spent) || byName(a, b),
  );

  const limited = categories.filter((category) => category.planned !== null);
  const discipline: PlanDiscipline = {
    respected: limited.filter((category) => category.status !== 'exceeded')
      .length,
    total: limited.length,
  };

  const fundSums = Object.values(MacroFund).map((fund) => {
    const inFund = categories.filter((category) => category.macroFund === fund);
    return {
      fund,
      planned: sum(inFund.map((category) => toCents(category.planned ?? '0'))),
      spent: sum(inFund.map((category) => toCents(category.spent))),
    };
  });
  const fundsPlanned = sum(fundSums.map((item) => item.planned));
  const fundsSpent = sum(fundSums.map((item) => item.spent));

  const funds: PlanFundItem[] = fundSums.map((item) => ({
    fund: item.fund,
    planned: fromCents(item.planned),
    spent: fromCents(item.spent),
    plannedShare: share(item.planned, fundsPlanned),
    actualShare: share(item.spent, fundsSpent),
  }));

  return {
    planned: fromCents(plannedCents),
    spent: fromCents(spentCents),
    discipline,
    categories,
    unassignedSpent: fromCents(spentCents - fundsSpent),
    funds,
    periodPoints: periods.map((period) => ({
      from: period.from,
      to: period.to,
      planned: period.plan ? fromCents(toCents(period.plan.planned)) : null,
      spent: fromCents(spentByPeriod.get(period.id) ?? 0),
    })),
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Защита от бесконечного цикла при кривых датах
const MAX_DAYS = 366;

const parseDate = (value: string): number => {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const formatDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

export interface DailyPointsInput {
  from: string;
  // Конец цикла. null — не задан, идём до сегодня и плановой линии нет
  cycleEnd: string | null;
  today: string;
  plannedCents: number | null;
  // Расходы по дням (копейки), ключ — «YYYY-MM-DD»
  spentByDay: Map<string, number>;
}

// Накопительные план и факт по дням цикла. План — равномерно: каждый день
// «разрешено» одинаковую долю. Факт после сегодняшнего дня — null.
export function buildDailyPoints({
  from,
  cycleEnd,
  today,
  plannedCents,
  spentByDay,
}: DailyPointsInput): PlanTimelinePoint[] {
  const startMs = parseDate(from);
  const endMs = parseDate(cycleEnd ?? today);
  const todayMs = parseDate(today);
  const daysTotal = Math.round((endMs - startMs) / MS_PER_DAY) + 1;
  if (daysTotal <= 0) return [];

  // План 0 считаем как «плана нет»
  const hasPlan =
    cycleEnd !== null && plannedCents !== null && plannedCents > 0;

  const points: PlanTimelinePoint[] = [];
  let cumulative = 0;
  for (let i = 0; i < Math.min(daysTotal, MAX_DAYS); i++) {
    const dayMs = startMs + i * MS_PER_DAY;
    const day = formatDate(dayMs);
    cumulative += spentByDay.get(day) ?? 0;

    points.push({
      from: day,
      to: day,
      planned: hasPlan
        ? fromCents(Math.round((plannedCents * (i + 1)) / daysTotal))
        : null,
      spent: dayMs <= todayMs ? fromCents(cumulative) : null,
    });
  }

  return points;
}

export interface TagRow {
  tagId: string;
  name: string;
  color: string;
  total: string;
  count: number;
}

export const OTHER_TAGS_NAME = 'Остальные теги';
export const UNTAGGED_NAME = 'Без тегов';

// Срезы круговой диаграммы: самые крупные теги, хвост — в «Остальные теги»,
// расходы без тегов — отдельным срезом. Проценты — доля от суммы срезов
// (транзакция с несколькими тегами попадает в каждый из них).
export function buildTagSlices(
  rows: TagRow[],
  untagged: { total: string; count: number },
  maxTags = 8,
): PlanTagSlice[] {
  const sorted = [...rows].sort(
    (a, b) => toCents(b.total) - toCents(a.total) || byName(a, b),
  );

  const slices: Omit<PlanTagSlice, 'percent'>[] = [];
  if (sorted.length <= maxTags) {
    slices.push(...sorted.map(toSlice));
  } else {
    const head = sorted.slice(0, maxTags - 1);
    const tail = sorted.slice(maxTags - 1);
    slices.push(...head.map(toSlice), {
      tagId: null,
      name: OTHER_TAGS_NAME,
      color: null,
      total: fromCents(sum(tail.map((row) => toCents(row.total)))),
      count: sum(tail.map((row) => row.count)),
    });
  }

  if (toCents(untagged.total) > 0) {
    slices.push({
      tagId: null,
      name: UNTAGGED_NAME,
      color: null,
      total: fromCents(toCents(untagged.total)),
      count: untagged.count,
    });
  }

  const whole = sum(slices.map((slice) => toCents(slice.total)));
  return slices.map((slice) => ({
    ...slice,
    percent: share(toCents(slice.total), whole) ?? 0,
  }));
}

const toSlice = (row: TagRow): Omit<PlanTagSlice, 'percent'> => ({
  tagId: row.tagId,
  name: row.name,
  color: row.color,
  total: fromCents(toCents(row.total)),
  count: row.count,
});
