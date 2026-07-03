import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { TagEntity } from './tag.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { CreateTagDto, UpdateTagDto } from './dto';

@Injectable()
export class TagsService {
  constructor(private readonly datasource: DataSource) {}

  private get repo() {
    return this.datasource.getRepository(TagEntity);
  }

  async findOne(dto: Partial<TagEntity>): Promise<TagEntity | null> {
    return this.repo.findOneBy(dto as FindOptionsWhere<TagEntity>);
  }

  async findByIds(ids: string[], workspaceId: string): Promise<TagEntity[]> {
    if (!ids.length) return [];
    return this.repo
      .createQueryBuilder('tag')
      .where('tag.id IN (:...ids)', { ids })
      .andWhere('tag.workspaceId = :workspaceId', { workspaceId })
      .getMany();
  }

  async create(dto: CreateTagDto, workspaceId: string): Promise<TagEntity> {
    const existing = await this.findOne({ name: dto.name, workspaceId });
    if (existing)
      throw ApiException.badRequest('Tag with this name already exists');

    return this.repo.save({ ...dto, workspaceId });
  }

  async update(
    id: string,
    dto: UpdateTagDto,
    workspaceId: string,
  ): Promise<TagEntity> {
    const tag = await this.findOne({ id, workspaceId });
    if (!tag) throw ApiException.badRequest('Tag not found');

    if (dto.name && dto.name !== tag.name) {
      const nameConflict = await this.findOne({ name: dto.name, workspaceId });
      if (nameConflict)
        throw ApiException.badRequest('Tag with this name already exists');
    }

    await this.repo.update(id, dto);
    return (await this.findOne({ id }))!;
  }

  async delete(id: string, workspaceId: string): Promise<{ message: string }> {
    const tag = await this.findOne({ id, workspaceId });
    if (!tag) throw ApiException.badRequest('Tag not found');

    await this.repo.softDelete(id);
    return { message: 'Tag was deleted' };
  }

  async findAll(workspaceId: string, search?: string): Promise<TagEntity[]> {
    const where: FindOptionsWhere<TagEntity> = { workspaceId };
    if (search) {
      where.name = ILike(`%${search}%`);
    }
    return this.repo.find({ where });
  }
}
