import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';

@Injectable()
export class CategoryService {
  constructor(private readonly datasource: DataSource) {}

  async findByOne(dto) {
    return await this.datasource.getRepository(CategoryEntity).findOneBy(dto);
  }

  async create({ name, description }: { name: string; description?: string }) {
    const category = await this.findByOne({ name });

    if (category) throw ApiException.badRequest('Error');

    return await this.datasource
      .getRepository(CategoryEntity)
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
      .getRepository(CategoryEntity)
      .update(id, { name, description });
    return await this.findByOne({ id });
  }

  async delete(id: string) {
    await this.datasource.getRepository(CategoryEntity).delete(id);
    return {
      message: 'Category was deleted',
    };
  }

  async getAll() {
    return await this.datasource.getRepository(CategoryEntity).findAndCount();
  }
}
