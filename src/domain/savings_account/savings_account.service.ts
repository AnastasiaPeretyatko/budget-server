import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { SavingAccountEntity } from './savings_account.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateSavingAccountDto,
  UpdateSavingAccountDto,
  SavingAccountRaw,
} from './types';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import {
  TransitionEntity,
  TransactionType,
} from '../transition/transition.entity';

@Injectable()
export class SavingAccountService {
  constructor(
    private readonly datasource: DataSource,
    @InjectRepository(SavingAccountEntity)
    private readonly savingRepository: Repository<SavingAccountEntity>,
    private readonly billingPeriodService: BillingPeriodService,
  ) {}

  async findByOne(dto: FindOptionsWhere<SavingAccountEntity>) {
    return await this.datasource
      .getRepository(SavingAccountEntity)
      .findOneBy(dto);
  }

  private sanitizeAmount(amount: string): string {
    return amount.replace(',', '.');
  }

  async create(
    { name, description, amount }: CreateSavingAccountDto,
    workspaceId: string,
    userId?: string,
  ) {
    const account = await this.findByOne({ name, workspaceId });
    if (account) throw ApiException.badRequest('Error');

    const sanitizedAmount = this.sanitizeAmount(amount);

    const savedAccount = await this.datasource.transaction(async (manager) => {
      const savedAccount = await manager
        .getRepository(SavingAccountEntity)
        .save({
          name,
          description,
          amount: '0',
          workspaceId,
        });

      if (Number(sanitizedAmount) > 0) {
        await manager
          .getRepository(SavingAccountEntity)
          .update(savedAccount.id, {
            amount: () => `amount + ${sanitizedAmount}`,
          });

        await manager.getRepository(TransitionEntity).save({
          toAccountId: savedAccount.id,
          fromAccountId: null,
          amount: sanitizedAmount,
          type: TransactionType.INCOME,
          date: new Date(),
          workspaceId,
          createdById: userId ?? null,
        });
      }

      return savedAccount;
    });

    return this.getOne(savedAccount.id, workspaceId);
  }

  async update(
    { id, name, description, amount }: UpdateSavingAccountDto,
    workspaceId: string,
  ) {
    const account = await this.findByOne({ id, workspaceId });

    if (!account) throw ApiException.badRequest('Error');
    if (name) {
      const existingAccount = await this.datasource
        .getRepository(SavingAccountEntity)
        .findOne({ where: { name, workspaceId } });

      if (existingAccount && existingAccount.id !== id) {
        throw ApiException.badRequest('Account with this name already exists');
      }
    }

    await this.datasource.getRepository(SavingAccountEntity).update(id, {
      name,
      description,
      amount: amount !== undefined ? this.sanitizeAmount(amount) : undefined,
    });

    return await this.findByOne({ id });
  }

  async delete(id: string, workspaceId: string) {
    const account = await this.findByOne({ id, workspaceId });
    if (!account) throw ApiException.badRequest('Error');

    if (Number(account.amount) !== 0) {
      throw ApiException.badRequest(
        'Cannot archive account with non-zero balance',
      );
    }

    await this.savingRepository.softDelete(id);

    return {
      message: 'Account was archived',
    };
  }

  private async getPeriodDateRange(
    workspaceId: string,
  ): Promise<{ from: string; to: string } | null> {
    const period = await this.billingPeriodService.getLatestActive(workspaceId);
    if (!period) return null;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (period.startDay) {
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();

      const from =
        day >= period.startDay
          ? new Date(year, month, period.startDay)
          : new Date(year, month - 1, period.startDay);

      return { from: from.toISOString().slice(0, 10), to: todayStr };
    }

    if (period.startDate) {
      return { from: period.startDate, to: todayStr };
    }

    return null;
  }

  async getOne(id: string, workspaceId: string) {
    const range = await this.getPeriodDateRange(workspaceId);
    const dateCondition = range
      ? `AND t.date BETWEEN :periodFrom AND :periodTo`
      : '';

    const qb = this.savingRepository
      .createQueryBuilder('sa')
      .addSelect(
        `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.to_account_id = sa.id AND t.deleted_at IS NULL ${dateCondition}), 0)`,
        'periodIncome',
      )
      .addSelect(
        `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.from_account_id = sa.id AND t.deleted_at IS NULL ${dateCondition}), 0)`,
        'periodExpense',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM transactions t WHERE (t.to_account_id = sa.id OR t.from_account_id = sa.id) AND t.deleted_at IS NULL ${dateCondition})`,
        'transactionCount',
      )
      .where('sa.workspaceId = :workspaceId', { workspaceId })
      .andWhere('sa.id = :id', { id });

    if (range) {
      qb.setParameters({ periodFrom: range.from, periodTo: range.to });
    }

    const result = await qb.getRawAndEntities<SavingAccountRaw>();

    if (!result.entities.length) {
      throw ApiException.badRequest('Account not found');
    }

    const entity = result.entities[0];
    const periodIncome = Number(result.raw[0].periodIncome);
    const periodExpense = Number(result.raw[0].periodExpense);

    return {
      ...entity,
      periodIncome: periodIncome.toFixed(2),
      periodExpense: periodExpense.toFixed(2),
      periodStartBalance: (
        Number(entity.amount) -
        periodIncome +
        periodExpense
      ).toFixed(2),
      transactionCount: Number(result.raw[0].transactionCount),
    };
  }

  async getAll(workspaceId: string, search?: string) {
    const range = await this.getPeriodDateRange(workspaceId);
    const dateCondition = range
      ? `AND t.date BETWEEN :periodFrom AND :periodTo`
      : '';

    const qb = this.savingRepository
      .createQueryBuilder('sa')
      .addSelect(
        `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.to_account_id = sa.id AND t.deleted_at IS NULL ${dateCondition}), 0)`,
        'periodIncome',
      )
      .addSelect(
        `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.from_account_id = sa.id AND t.deleted_at IS NULL ${dateCondition}), 0)`,
        'periodExpense',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM transactions t WHERE (t.to_account_id = sa.id OR t.from_account_id = sa.id) AND t.deleted_at IS NULL ${dateCondition})`,
        'transactionCount',
      )
      .where('sa.workspaceId = :workspaceId', { workspaceId });

    if (range) {
      qb.setParameters({ periodFrom: range.from, periodTo: range.to });
    }

    if (search) {
      qb.andWhere('sa.name ILIKE :search', { search: `%${search}%` });
    }

    const result = await qb.getRawAndEntities<SavingAccountRaw>();

    return result.entities.map((entity, i) => {
      const periodIncome = Number(result.raw[i].periodIncome);
      const periodExpense = Number(result.raw[i].periodExpense);

      return {
        ...entity,
        periodIncome: periodIncome.toFixed(2),
        periodExpense: periodExpense.toFixed(2),
        periodStartBalance: (
          Number(entity.amount) -
          periodIncome +
          periodExpense
        ).toFixed(2),
        transactionCount: Number(result.raw[i].transactionCount),
      };
    });
  }
}
