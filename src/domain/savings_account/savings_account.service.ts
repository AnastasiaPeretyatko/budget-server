import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SavingAccountEntity } from './savings_account.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { InjectRepository } from '@nestjs/typeorm';

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

  async create({
    name,
    description,
    amount,
  }: {
    name: string;
    description?: string;
    amount: string;
  }): Promise<SavingAccountEntity> {
    const account = await this.findByOne({ name });
    if (account) throw ApiException.badRequest('Error');

    return this.savingRepository.save({ name, description, amount });
  }

  async update({
    id,
    name,
    description,
    amount,
  }: {
    id: string;
    name?: string;
    description?: string;
    amount?: string;
  }) {
    const account = await this.findByOne({ id });

    if (!account) throw ApiException.badRequest('Error');
    if (name) {
      const existingAccount = await this.datasource
        .getRepository(SavingAccountEntity)
        .findOne({ where: { name } });

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

  async delete(id: string) {
    await this.datasource.getRepository(SavingAccountEntity).delete(id);

    return {
      message: 'Account was deleted',
    };
  }

  async getAll() {
    return this.datasource.getRepository(SavingAccountEntity).find();
  }
}
