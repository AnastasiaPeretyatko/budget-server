import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WorkspaceUserEntity } from 'src/domain/workspace/workspace_user.entity';
import type { AuthRequest } from 'src/domain/auth/jwt-auth.guard';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();

    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const workspaceId = req.headers['x-workspace-id'];
    if (!workspaceId || Array.isArray(workspaceId)) {
      return true;
    }

    const membership = await this.dataSource
      .getRepository(WorkspaceUserEntity)
      .findOne({ where: { userId, workspaceId } });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return true;
  }
}
