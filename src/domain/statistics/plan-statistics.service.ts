import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toCents, fromCents } from 'src/common/utils/money';
import {
  BillingPeriodEntity,
  BillingPeriodStatus,
} from '../billing_period/billing_period.entity';
import {
  calculateCycleBounds,
  formatLocalDate,
} from '../billing_period/utils/cycle-bounds';
import {
  buildPlan,
  buildSnapshotPlan,
} from '../billing_period/utils/period-plan';
import { CategoriesEntity } from '../categories/categories.entity';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { PlanRange, PlanStatisticsResponse } from './dto';
import { getWindowEnd, PlanWindow, selectWindows } from './utils/plan-range';
import {
  buildDailyPoints,
  buildPlanReport,
  buildTagSlices,
  CategoryMeta,
  PeriodSpentRow,
  TagRow,
} from './utils/plan-report';

// Расход — как в остальной статистике: fromAccountId IS NOT NULL AND toAccountId IS NULL.
// Окна — циклы, по которым считаем ($2 — начала, $3 — концы, включительно).
// Через EXISTS, а не JOIN: если окна пересекутся, транзакция не посчитается дважды.
const EXPENSE_IN_WINDOWS = `
  t.workspace_id = $1
  AND t.deleted_at IS NULL
  AND t.from_account_id IS NOT NULL
  AND t.to_account_id IS NULL
  AND EXISTS (
    SELECT 1 FROM unnest($2::date[], $3::date[]) AS w(from_date, to_date)
    WHERE t.date >= w.from_date AND t.date < w.to_date + 1
  )`;

// Живые теги транзакции (удалённые теги не считаем)
const LIVE_TAG_JOIN = `
  transaction_tags tt
  JOIN tags tg ON tg.id = tt.tag_id AND tg.deleted_at IS NULL`;

@Injectable()
export class PlanStatisticsService {
  constructor(private readonly datasource: DataSource) {}

  async getPlan(
    workspaceId: string,
    range: PlanRange = PlanRange.CYCLE,
    now: Date = new Date(),
  ): Promise<PlanStatisticsResponse> {
    const today = formatLocalDate(now);

    const [periods, categories, safeAccountsCount] = await Promise.all([
      this.datasource
        .getRepository(BillingPeriodEntity)
        .createQueryBuilder('p')
        .addSelect(['p.plannedAmount', 'p.planSnapshot'])
        .where('p.workspaceId = :workspaceId', { workspaceId })
        .orderBy('p.createdAt', 'ASC')
        .getMany(),
      // Вместе с удалёнными: по ним могли быть расходы и лимиты в снимках
      this.datasource
        .getRepository(CategoriesEntity)
        .find({ where: { workspaceId }, withDeleted: true }),
      this.getSafeAccountsCount(workspaceId),
    ]);

    const activeCategories = categories.filter(
      (category) => category.deletedAt === null,
    );
    const allWindows = this.buildWindows(periods, activeCategories, now, today);
    const windows = selectWindows(allWindows, range, today);

    const categoryMeta = new Map<string, CategoryMeta>(
      categories.map((category) => [
        category.id,
        {
          name: category.name,
          icon: category.icon ?? null,
          color: category.color ?? null,
          macroFund: category.macroFund,
        },
      ]),
    );

    const activeWindow = allWindows.filter((window) => window.isActive).at(-1);
    const cycleDays = activeWindow?.bounds.daysTotal ?? null;

    const params = [
      workspaceId,
      windows.map((window) => window.from),
      windows.map((window) => window.to),
    ];

    const [spentRows, tagRows, untagged, toSafe] = windows.length
      ? await Promise.all([
          this.getSpentRows(workspaceId, windows),
          this.getTagRows(params),
          this.getUntagged(params),
          this.getToSafe(params),
        ])
      : [[], [], { total: '0', count: 0 }, '0'];

    const report = buildPlanReport({
      periods: windows,
      spentRows,
      categoryMeta,
    });

    const useDays = range === PlanRange.CYCLE && windows.length === 1;
    const timeline: PlanStatisticsResponse['timeline'] = useDays
      ? {
          granularity: 'day',
          points: buildDailyPoints({
            from: windows[0].from,
            cycleEnd: windows[0].bounds.endDate,
            today,
            plannedCents: windows[0].plan
              ? toCents(windows[0].plan.planned)
              : null,
            spentByDay: await this.getSpentByDay(
              workspaceId,
              windows[0].from,
              windows[0].to,
            ),
          }),
        }
      : { granularity: 'period', points: report.periodPoints };

    return {
      range,
      from: windows[0]?.from ?? null,
      to: windows.at(-1)?.to ?? null,
      periodsCount: windows.length,
      cycleDays,
      totals: { planned: report.planned, spent: report.spent, toSafe },
      safeAccountsCount,
      discipline: report.discipline,
      timeline,
      categories: report.categories,
      unassignedSpent: report.unassignedSpent,
      funds: report.funds,
      tags: buildTagSlices(tagRows, untagged),
    };
  }

  // Окна расходов всех циклов, у которых можно определить даты.
  // Закрытый цикл без дат (закрыт до появления снимка) пропускаем,
  // как и в истории циклов.
  private buildWindows(
    periods: BillingPeriodEntity[],
    activeCategories: CategoriesEntity[],
    now: Date,
    today: string,
  ): PlanWindow[] {
    const windows: PlanWindow[] = [];

    for (const period of periods) {
      const isActive = period.status === BillingPeriodStatus.ACTIVE;
      if (!isActive && (!period.startDate || !period.endDate)) continue;

      const bounds = calculateCycleBounds(period, now);
      if (!bounds) continue;

      const to = getWindowEnd(bounds, isActive, today);
      // Цикл ещё не начался — расходов в нём быть не может
      if (bounds.startDate > to) continue;

      windows.push({
        id: period.id,
        isActive,
        from: bounds.startDate,
        to,
        bounds,
        plan: isActive
          ? buildPlan(
              activeCategories.map((category) => ({
                ...category,
                icon: category.icon ?? null,
              })),
            )
          : buildSnapshotPlan(period),
      });
    }

    return windows;
  }

  // Расходы по циклам и категориям одним запросом. Если даты циклов
  // пересекаются, транзакция относится к циклу, начавшемуся позже, —
  // так она не посчитается дважды и итоги совпадут с тегами.
  private async getSpentRows(
    workspaceId: string,
    windows: PlanWindow[],
  ): Promise<PeriodSpentRow[]> {
    return this.datasource.query<PeriodSpentRow[]>(
      `SELECT w.period_id AS "periodId",
              t.categories_id AS "categoryId",
              COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN LATERAL (
         SELECT w.period_id
         FROM unnest($2::uuid[], $3::date[], $4::date[]) AS w(period_id, from_date, to_date)
         WHERE t.date >= w.from_date AND t.date < w.to_date + 1
         ORDER BY w.from_date DESC
         LIMIT 1
       ) w ON true
       WHERE t.workspace_id = $1
         AND t.deleted_at IS NULL
         AND t.from_account_id IS NOT NULL
         AND t.to_account_id IS NULL
       GROUP BY w.period_id, t.categories_id`,
      [
        workspaceId,
        windows.map((window) => window.id),
        windows.map((window) => window.from),
        windows.map((window) => window.to),
      ],
    );
  }

  private async getSpentByDay(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const rows = await this.datasource.query<
      Array<{ day: string; total: string }>
    >(
      `SELECT TO_CHAR(t.date, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       WHERE t.workspace_id = $1
         AND t.deleted_at IS NULL
         AND t.from_account_id IS NOT NULL
         AND t.to_account_id IS NULL
         AND t.date >= $2::date
         AND t.date < $3::date + 1
       GROUP BY 1`,
      [workspaceId, from, to],
    );

    return new Map(rows.map((row) => [row.day, toCents(row.total)]));
  }

  private async getTagRows(params: unknown[]): Promise<TagRow[]> {
    return this.datasource.query<TagRow[]>(
      `SELECT tg.id AS "tagId", tg.name, tg.color,
              COALESCE(SUM(t.amount), 0) AS total,
              COUNT(t.id)::int AS "count"
       FROM transactions t
       JOIN ${LIVE_TAG_JOIN} ON tt.transaction_id = t.id
       WHERE ${EXPENSE_IN_WINDOWS}
       GROUP BY tg.id, tg.name, tg.color`,
      params,
    );
  }

  private async getUntagged(
    params: unknown[],
  ): Promise<{ total: string; count: number }> {
    const [row] = await this.datasource.query<
      Array<{ total: string; count: number }>
    >(
      `SELECT COALESCE(SUM(t.amount), 0) AS total, COUNT(t.id)::int AS "count"
       FROM transactions t
       WHERE ${EXPENSE_IN_WINDOWS}
         AND NOT EXISTS (
           SELECT 1 FROM ${LIVE_TAG_JOIN} WHERE tt.transaction_id = t.id
         )`,
      params,
    );

    return { total: row?.total ?? '0', count: row?.count ?? 0 };
  }

  private async getSafeAccountsCount(workspaceId: string): Promise<number> {
    return this.datasource
      .getRepository(SavingAccountEntity)
      .countBy({ workspaceId, isSafe: true });
  }

  // Переводы на накопительные с флагом «сейф». Переводы между сейфами
  // не считаем: деньги остались в резерве.
  private async getToSafe(params: unknown[]): Promise<string> {
    const [row] = await this.datasource.query<Array<{ total: string }>>(
      `SELECT COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN savings_account sa ON sa.id = t.to_account_id AND sa.is_safe = true
       LEFT JOIN savings_account fa ON fa.id = t.from_account_id
       WHERE t.workspace_id = $1
         AND t.deleted_at IS NULL
         AND t.type = 'transfer'
         AND (fa.id IS NULL OR fa.is_safe = false)
         AND EXISTS (
           SELECT 1 FROM unnest($2::date[], $3::date[]) AS w(from_date, to_date)
           WHERE t.date >= w.from_date AND t.date < w.to_date + 1
         )`,
      params,
    );

    return fromCents(toCents(row?.total ?? '0'));
  }
}
