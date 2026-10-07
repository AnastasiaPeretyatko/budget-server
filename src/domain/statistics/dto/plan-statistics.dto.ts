import { IsEnum, IsOptional } from 'class-validator';
import { MacroFund } from '../../categories/types';
import { CategoryCycleStatus } from '../../categories/utils/category-cycle';
import { PlanRange } from './plan-range.enum';

export class PlanStatisticsQueryDto {
  @IsEnum(PlanRange)
  @IsOptional()
  range?: PlanRange;
}

export interface PlanTotals {
  // Сумма лимитов конвертов за выбранные циклы
  planned: string;
  spent: string;
  // Переводы на накопительные с флагом «сейф»
  toSafe: string;
}

// Конверты (категории), уложившиеся в лимит: respected из total.
// В total входят только конверты с лимитом.
export interface PlanDiscipline {
  respected: number;
  total: number;
}

export interface PlanTimelinePoint {
  from: string;
  to: string;
  planned: string | null;
  // null — день ещё не наступил
  spent: string | null;
}

export interface PlanTimeline {
  // day — накопительно по дням текущего цикла, period — по циклам
  granularity: 'day' | 'period';
  points: PlanTimelinePoint[];
}

export interface PlanCategoryItem {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  macroFund: MacroFund | null;
  // null — лимита нет
  planned: string | null;
  spent: string;
  percent: number | null;
  status: CategoryCycleStatus;
}

export interface PlanTagSlice {
  // null — «Без тегов» и «Остальные теги»
  tagId: string | null;
  name: string;
  color: string | null;
  total: string;
  count: number;
  percent: number;
}

export interface PlanFundItem {
  fund: MacroFund;
  planned: string;
  spent: string;
  // Доли от суммы по трём фондам, %. null — по фондам нет данных
  plannedShare: number | null;
  actualShare: number | null;
}

export interface PlanStatisticsResponse {
  range: PlanRange;
  // Окно, по которому всё посчитано. null — циклов нет
  from: string | null;
  to: string | null;
  periodsCount: number;
  // Длина текущего цикла — для подписи вкладки
  cycleDays: number | null;
  totals: PlanTotals;
  // Сколько накопительных отмечено как «сейф». 0 — отложенное считать не на что
  safeAccountsCount: number;
  discipline: PlanDiscipline;
  timeline: PlanTimeline;
  categories: PlanCategoryItem[];
  // Расходы без категории или у категории без макро-фонда
  unassignedSpent: string;
  funds: PlanFundItem[];
  tags: PlanTagSlice[];
}
