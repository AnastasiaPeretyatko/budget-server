import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillingPeriodEntity,
  BillingPeriodStatus,
} from './billing_period.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { CreateBillingPeriodDto, UpdateBillingPeriodDto } from './types';

@Injectable()
export class BillingPeriodService {
  constructor(
    @InjectRepository(BillingPeriodEntity)
    private readonly billingPeriodRepository: Repository<BillingPeriodEntity>,
  ) {}

  async create(
    dto: CreateBillingPeriodDto,
    workspaceId: string,
  ): Promise<BillingPeriodEntity> {
    return this.billingPeriodRepository.save({
      startDate: dto.startDate,
      endDate: dto.endDate,
      startDay: dto.startDay,
      workspaceId,
    });
  }

  async update({ id, ...dto }: UpdateBillingPeriodDto, workspaceId: string) {
    const period = await this.billingPeriodRepository.findOneBy({
      id,
      workspaceId,
    });

    if (!period) throw ApiException.badRequest('Billing period not found');

    await this.billingPeriodRepository.update(id, dto);

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

  async getLatest(workspaceId: string): Promise<BillingPeriodEntity | null> {
    return this.billingPeriodRepository.findOne({
      where: { workspaceId },
      order: { startDate: 'DESC' },
    });
  }

  async getLatestActive(
    workspaceId: string,
  ): Promise<BillingPeriodEntity | null> {
    return this.billingPeriodRepository.findOne({
      where: { workspaceId, status: BillingPeriodStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async getAll(workspaceId: string) {
    return this.billingPeriodRepository.find({
      where: { workspaceId },
      order: { startDate: 'DESC' },
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
