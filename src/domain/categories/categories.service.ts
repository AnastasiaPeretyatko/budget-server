import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';

@Injectable()
export class CategoriesService {
  constructor(private readonly datasource: DataSource) {}

  async findByOne(dto) {
    return await this.datasource.getRepository(CategoriesEntity).findOneBy(dto);
  }

  async create({ name, description }: { name: string; description?: string }) {
    const category = await this.findByOne({ name });

    if (category) throw ApiException.badRequest('Error');

    return await this.datasource
      .getRepository(CategoriesEntity)
      .save({ name, description });
  }

  async update({
    id,
    name,
    description,
  }: {
    id: string;
    name?: string;
    description?: string;
  }) {
    const category = await this.findByOne({ id });
    const existName = await this.findByOne({ name });

    if (!category || (existName && existName.id !== id))
      throw ApiException.badRequest('Error');

    await this.datasource
      .getRepository(CategoriesEntity)
      .update(id, { name, description });
    return await this.findByOne({ id });
  }

  async delete(id: string) {
    await this.datasource.getRepository(CategoriesEntity).delete(id);
    return {
      message: 'Category was deleted',
    };
  }

  async getAll() {
    return await this.datasource.getRepository(CategoriesEntity).findAndCount();
  }
}
