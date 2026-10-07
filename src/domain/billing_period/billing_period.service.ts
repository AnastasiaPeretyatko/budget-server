import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BillingPeriodEntity,
  BillingPeriodStatus,
} from './billing_period.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { CreateBillingPeriodDto, UpdateBillingPeriodDto } from './dto';
import {
  calculateCycleBounds,
  CycleBounds,
  formatLocalDate,
} from './utils/cycle-bounds';
import { buildPlan } from './utils/period-plan';
import { CategoriesEntity } from '../categories/categories.entity';

@Injectable()
export class BillingPeriodService {
  constructor(
    @InjectRepository(BillingPeriodEntity)
    private readonly billingPeriodRepository: Repository<BillingPeriodEntity>,
    private readonly datasource: DataSource,
  ) {}

  // Прошлый активный период закрывается и создаётся следующий — в одной
  // транзакции: если создание не удалось, прошлый остаётся активным.
  async create(
    dto: CreateBillingPeriodDto,
    workspaceId: string,
  ): Promise<BillingPeriodEntity> {
    const today = new Date();

    return this.datasource.transaction(async (manager) => {
      const lastPeriod = await this.getLatestActive(workspaceId, manager);
      if (lastPeriod) await this.closePeriod(manager, lastPeriod, today);

      const repo = manager.getRepository(BillingPeriodEntity);
      const saved = await repo.save({
        startDate: dto.startDate,
        endDate: dto.endDate,
        startDay: dto.startDay,
        workspaceId,
      });

      // save возвращает и скрытые колонки (select: false) — читаем заново,
      // чтобы форма ответа не изменилась
      return (await repo.findOneBy({ id: saved.id }))!;
    });
  }

  async update(
    { id, ...dto }: UpdateBillingPeriodDto & { id: string },
    workspaceId: string,
  ) {
    const period = await this.getOne(id, workspaceId);

    const startDate = dto.startDate ?? period.startDate;
    const endDate = dto.endDate ?? period.endDate;
    if (startDate && endDate && endDate < startDate)
      throw ApiException.badRequest(
        'endDate must not be earlier than startDate',
      );

    const { status, ...fields } = dto;
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    // Уже закрытый период второй раз не закрываем и план не пересчитываем
    const shouldClose =
      status === BillingPeriodStatus.COMPLETED &&
      period.status === BillingPeriodStatus.ACTIVE;

    await this.datasource.transaction(async (manager) => {
      // update с пустым набором полей TypeORM не принимает
      if (Object.keys(changes).length > 0) {
        await manager.getRepository(BillingPeriodEntity).update(id, changes);
      }
      if (shouldClose) {
        await this.closePeriod(manager, { ...period, ...changes }, new Date());
      }
    });

    return this.billingPeriodRepository.findOneBy({ id });
  }

  async delete(id: string, workspaceId: string) {
    const period = await this.billingPeriodRepository.findOneBy({
      id,
      workspaceId,
    });

    if (!period) throw ApiException.badRequest('Billing period not found');

    await this.billingPeriodRepository.delete(id);

    return { message: 'Billing period was deleted' };
  }

  async getOne(id: string, workspaceId: string) {
    const period = await this.billingPeriodRepository.findOneBy({
      id,
      workspaceId,
    });

    if (!period) throw ApiException.badRequest('Billing period not found');

    return period;
  }

  async getLatestActive(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<BillingPeriodEntity | null> {
    const repo = manager
      ? manager.getRepository(BillingPeriodEntity)
      : this.billingPeriodRepository;

    return repo.findOne({
      where: { workspaceId, status: BillingPeriodStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async getCurrentCycle(
    workspaceId: string,
    today: Date = new Date(),
  ): Promise<CycleBounds | null> {
    const period = await this.getLatestActive(workspaceId);
    if (!period) return null;

    return calculateCycleBounds(period, today);
  }

  // Границы любого периода workspace по id (не только активного)
  async getCycleById(
    id: string,
    workspaceId: string,
    today: Date = new Date(),
  ): Promise<CycleBounds | null> {
    const period = await this.getOne(id, workspaceId);

    return calculateCycleBounds(period, today);
  }

  async getPrevActive(
    workspaceId: string,
  ): Promise<BillingPeriodEntity | null> {
    const period = await this.billingPeriodRepository.find({
      where: { workspaceId, status: BillingPeriodStatus.COMPLETED },
      order: { startDate: 'DESC' },
      take: 1,
    });
    return period[0] || null;
  }

  async getAll(workspaceId: string) {
    return this.billingPeriodRepository.find({
      where: { workspaceId },
      order: { startDate: 'DESC' },
    });
  }

  // Закрывает период и фиксирует результат: даты (если период задан только
  // числом месяца), план расходов, снимок лимитов и время закрытия.
  // Вызывается внутри транзакции (manager).
  private async closePeriod(
    manager: EntityManager,
    period: BillingPeriodEntity,
    today: Date,
  ): Promise<void> {
    const bounds = calculateCycleBounds(period, today);

    const categories = await manager.getRepository(CategoriesEntity).find({
      where: { workspaceId: period.workspaceId },
      order: { name: 'ASC' },
    });
    const { planned, items } = buildPlan(
      categories.map((category) => ({
        ...category,
        icon: category.icon ?? null,
      })),
    );

    await manager.getRepository(BillingPeriodEntity).update(period.id, {
      status: BillingPeriodStatus.COMPLETED,
      startDate: period.startDate ?? bounds?.startDate ?? null,
      // Если конца нет — сегодняшний день
      endDate:
        period.endDate ??
        (bounds ? (bounds.endDate ?? formatLocalDate(today)) : null),
      plannedAmount: planned,
      planSnapshot: items,
      closedAt: () => 'now()',
    });
  }

  async getDaysFromStart(workspaceId: string): Promise<number> {
    const period = await this.billingPeriodRepository.findOne({
      where: { workspaceId, status: BillingPeriodStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!period)
      throw ApiException.badRequest('Active billing period not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period.startDate) {
      const start = new Date(period.startDate);
      start.setHours(0, 0, 0, 0);
      return Math.floor(
        (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    if (period.startDay) {
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();

      const periodStart =
        day >= period.startDay
          ? new Date(year, month, period.startDay)
          : new Date(year, month - 1, period.startDay);

      periodStart.setHours(0, 0, 0, 0);
      return Math.floor(
        (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    throw ApiException.badRequest(
      'Billing period has no start_date or start_day',
    );
  }
}
