import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPeriodEntity } from './billing_period.entity';
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

  async getAll(workspaceId: string) {
    return this.billingPeriodRepository.find({
      where: { workspaceId },
      order: { startDate: 'DESC' },
    });
  }
}
