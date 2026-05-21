import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SavingAccountEntity } from './savings_account.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateSavingAccountDto,
  UpdateSavingAccountDto,
  SavingAccountRaw,
} from './types';

@Injectable()
export class SavingAccountService {
  constructor(
    private readonly datasource: DataSource,
    @InjectRepository(SavingAccountEntity)
    private readonly savingRepository: Repository<SavingAccountEntity>,
  ) {}

  async findByOne(dto) {
    return await this.datasource
      .getRepository(SavingAccountEntity)
      .findOneBy(dto);
  }

  async create(
    { name, description, amount }: CreateSavingAccountDto,
    workspaceId: string,
  ): Promise<SavingAccountEntity> {
    const account = await this.findByOne({ name, workspaceId });
    if (account) throw ApiException.badRequest('Error');

    return this.savingRepository.save({ name, description, amount, workspaceId });
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
      amount,
    });

    return await this.findByOne({ id });
  }

  async delete(id: string, workspaceId: string) {
    const account = await this.findByOne({ id, workspaceId });
    if (!account) throw ApiException.badRequest('Error');

    await this.datasource.getRepository(SavingAccountEntity).delete(id);

    return {
      message: 'Account was deleted',
    };
  }

  async getAll(workspaceId: string) {
    const result = await this.savingRepository
      .createQueryBuilder('sa')
      .addSelect(
        `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.to_account_id = sa.id AND t.deleted_at IS NULL), 0)`,
        'spend',
      )
      .addSelect(
        `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.from_account_id = sa.id AND t.deleted_at IS NULL), 0)`,
        'remaining',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM transactions t WHERE (t.to_account_id = sa.id OR t.from_account_id = sa.id) AND t.deleted_at IS NULL)`,
        'transactionCount',
      )
      .where('sa.workspaceId = :workspaceId', { workspaceId })
      .getRawAndEntities<SavingAccountRaw>();

    return result.entities.map((entity, i) => ({
      ...entity,
      spend: result.raw[i].spend,
      remaining: result.raw[i].remaining,
      transactionCount: Number(result.raw[i].transactionCount),
    }));
  }
}
