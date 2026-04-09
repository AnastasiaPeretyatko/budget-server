import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { WorkspaceEntity } from './workspaces.entity';
import { CreateWorkspaceDto } from './dto';
import { WorkspaceUserEntity } from './workspace_user.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { UserService } from '../user/user.service';
import { UserEntity } from '../user/user.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly datasource: DataSource,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const workspace = await this.datasource.transaction(async (manager) => {
      const workspaceRepo = manager.getRepository(WorkspaceEntity);

      const workspace = await workspaceRepo.save({
        ownerId: userId,
        ...dto,
      });

      await manager.getRepository(WorkspaceUserEntity).save({
        workspaceId: workspace.id,
        userId: userId,
      });

      return workspace;
    });

    return await this.findById(workspace.id);
  }

  async findById(id: string) {
    return await this.datasource
      .getRepository(WorkspaceEntity)
      .createQueryBuilder('workspaces')
      .innerJoin('workspace_user', 'wu', 'wu.workspace_id = workspaces.id')
      .leftJoinAndSelect('workspaces.owner', 'owner')
      .addSelect('COUNT(wu.user_id)', 'userCount')
      .where('workspaces.id = :id', { id })
      .groupBy('workspaces.id')
      .addGroupBy('workspaces.owner_id')
      .addGroupBy('owner.id')
      .getOne();
  }

  async getAll(userId: string) {
    const { entities, raw } = await this.datasource
      .getRepository(WorkspaceEntity)
      .createQueryBuilder('workspaces')
      .innerJoin('workspace_user', 'wu', 'wu.workspace_id = workspaces.id')
      .leftJoinAndSelect('workspaces.owner', 'owner')
      .addSelect('COUNT(wu.user_id)', 'userCount')
      .where('wu.user_id = :userId', { userId })
      .groupBy('workspaces.id')
      .addGroupBy('workspaces.owner_id')
      .addGroupBy('owner.id')
      .getRawAndEntities();

    return entities.map((workspace, index) => ({
      ...workspace,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      userCount: Number(raw[index].userCount),
    }));
  }

  async inviteUser(dto: { workspaceId: string; emails: string[] }) {
    const { workspaceId, emails } = dto;
    const existingEmails = await this.getWorkspaceEmails(workspaceId);

    this.ensureNotInWorkspace(existingEmails, emails);

    const users = await this.getUsersByEmails(emails);

    this.ensureAllUsersExist(users, emails);

    await this.addUsersToWorkspace(workspaceId, users);

    return 'Success';
  }

  private async getWorkspaceEmails(workspaceId: string): Promise<Set<string>> {
    const workspaceUsers = await this.datasource
      .getRepository(WorkspaceUserEntity)
      .find({
        where: { workspaceId },
        relations: ['user'],
      });

    return new Set(workspaceUsers.map((w) => w.user.email));
  }

  private ensureNotInWorkspace(
    existingEmails: Set<string>,
    incomingEmails: string[],
  ) {
    const duplicates = incomingEmails.filter((email) =>
      existingEmails.has(email),
    );

    if (duplicates.length) {
      throw ApiException.badRequest(
        `Users already in workspace: ${duplicates.join(', ')}`,
      );
    }
  }

  private async getUsersByEmails(emails: string[]) {
    return this.datasource.getRepository(UserEntity).find({
      where: { email: In(emails) },
    });
  }

  private ensureAllUsersExist(users: UserEntity[], emails: string[]) {
    const foundEmails = new Set(users.map((u) => u.email));

    const notFound = emails.filter((email) => !foundEmails.has(email));

    if (notFound.length) {
      throw ApiException.badRequest(`Users not found: ${notFound.join(', ')}`);
    }
  }

  private async addUsersToWorkspace(workspaceId: string, users: UserEntity[]) {
    await this.datasource.getRepository(WorkspaceUserEntity).save(
      users.map((user) => ({
        workspaceId,
        userId: user.id,
      })),
    );
  }
}
