import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsRelations, ILike, In } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import {
  CreateTemplateDto,
  ParamsTemplateTemplatesDto,
  UpdateTemplateDto,
} from './dto';
import { TagEntity } from '../tags/tag.entity';
import { TagsService } from '../tags/tags.service';

// Один набор связей для списка и одного шаблона — формат ответов одинаковый
const RELATIONS: FindOptionsRelations<TemplateEntity> = {
  fromAccount: true,
  toAccount: true,
  category: true,
  tags: true,
};

@Injectable()
export class TemplateServise {
  constructor(
    private readonly datasource: DataSource,
    private readonly tagsService: TagsService,
  ) {}

  private get repo() {
    return this.datasource.getRepository(TemplateEntity);
  }

  // Шаблон только своего workspace; null — нет такого (или чужой)
  public async findOneByPk(id: string, workspaceId: string) {
    return await this.repo.findOne({
      where: { id, workspaceId },
      relations: RELATIONS,
    });
  }

  public async getOne(id: string, workspaceId: string) {
    const template = await this.findOneByPk(id, workspaceId);
    if (!template) throw ApiException.badRequest('Шаблон не найден');

    return template;
  }

  public async create(
    { tagIds, ...dto }: CreateTemplateDto,
    workspaceId: string,
  ): Promise<TemplateEntity> {
    const tags = await this.resolveTags(tagIds, workspaceId);

    const template = await this.repo.save({ ...dto, workspaceId, tags });

    return await this.getOne(template.id, workspaceId);
  }

  public async findAll(
    workspaceId: string,
    params: ParamsTemplateTemplatesDto,
  ) {
    // Фильтр прямо по связи tags отрезал бы лишние теги и из ответа
    // (у шаблона остались бы только выбранные), поэтому сначала находим id шаблонов
    const idsByTags = params.tagIds?.length
      ? await this.findIdsByTags(params.tagIds, workspaceId)
      : undefined;

    const [data, count] = await this.repo.findAndCount({
      where: {
        workspaceId,
        ...(params.search && { name: ILike(`%${params.search}%`) }),
        ...(params.type && { type: params.type }),
        ...(params.categoryIds?.length && {
          categoryId: In(params.categoryIds),
        }),
        ...(idsByTags && { id: In(idsByTags) }),
      },
      relations: RELATIONS,
      order: { createdAt: params.order },
      take: params.limit,
      skip: (params.page - 1) * params.limit,
    });

    return { data, count };
  }

  private async findIdsByTags(
    tagIds: string[],
    workspaceId: string,
  ): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('template')
      .select('template.id', 'id')
      .innerJoin('template.tags', 'tag', 'tag.id IN (:...tagIds)', { tagIds })
      .where('template.workspaceId = :workspaceId', { workspaceId })
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  public async archive(id: string, workspaceId: string) {
    await this.getOne(id, workspaceId);

    await this.repo.delete(id);
    return { message: 'Шаблон был удален' };
  }

  public async update(
    id: string,
    { tagIds, ...fields }: UpdateTemplateDto,
    workspaceId: string,
  ) {
    await this.getOne(id, workspaceId);

    // undefined — поле не передали, не трогаем. null — сбрасываем в базе.
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    // tagIds не передали — теги не трогаем; [] — убираем все
    const tags =
      tagIds === undefined
        ? undefined
        : await this.resolveTags(tagIds, workspaceId);

    // save с id обновляет только переданные поля и заменяет связи с тегами
    // (в одной транзакции); пустой набор изменений не отправляем
    if (Object.keys(changes).length > 0 || tags !== undefined) {
      await this.repo.save({ id, ...changes, ...(tags && { tags }) });
    }

    return await this.getOne(id, workspaceId);
  }

  // Теги шаблона: все должны существовать и принадлежать workspace
  private async resolveTags(
    tagIds: string[] | null | undefined,
    workspaceId: string,
  ): Promise<TagEntity[]> {
    const ids = [...new Set(tagIds ?? [])];
    if (!ids.length) return [];

    const tags = await this.tagsService.findByIds(ids, workspaceId);
    if (tags.length !== ids.length)
      throw ApiException.badRequest('Tag not found');

    return tags;
  }
}
