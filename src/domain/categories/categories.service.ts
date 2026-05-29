import { Injectable } from '@nestjs/common';
import { DataSource, ILike } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';

@Injectable()
export class CategoriesService {
  constructor(private readonly datasource: DataSource) {}

  async findByOne(dto: Partial<CategoriesEntity>) {
    return await this.datasource.getRepository(CategoriesEntity).findOneBy(dto);
  }

  async create(
    { name, description }: { name: string; description?: string },
    workspaceId: string,
  ) {
    const category = await this.findByOne({ name, workspaceId });
    if (category) throw ApiException.badRequest('Error');

    return await this.datasource
      .getRepository(CategoriesEntity)
      .save({ name, description, workspaceId });
  }

  async update(
    {
      id,
      name,
      description,
    }: {
      id: string;
      name?: string;
      description?: string;
    },
    workspaceId: string,
  ) {
    const category = await this.findByOne({ id, workspaceId });
    if (!category) throw ApiException.badRequest('Error');

    if (name) {
      const existName = await this.findByOne({ name, workspaceId });
      if (existName && existName.id !== id)
        throw ApiException.badRequest('Error');
    }

    await this.datasource
      .getRepository(CategoriesEntity)
      .update(id, { name, description });
    return await this.findByOne({ id });
  }

  async delete(id: string, workspaceId: string) {
    const category = await this.findByOne({ id, workspaceId });
    if (!category) throw ApiException.badRequest('Error');

    await this.datasource.getRepository(CategoriesEntity).delete(id);
    return {
      message: 'Category was deleted',
    };
  }

  async getAll(workspaceId: string, search?: string) {
    const where: any = { workspaceId };
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    return await this.datasource
      .getRepository(CategoriesEntity)
      .find({ where });
  }
}
