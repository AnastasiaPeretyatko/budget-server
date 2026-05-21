import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const workspaceId = request.headers['x-workspace-id'];

    if (!workspaceId || Array.isArray(workspaceId)) {
      throw new Error('X-Workspace-Id header is required');
    }

    return workspaceId;
  },
);
