import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceEntity } from './workspaces.entity';
import { WorkspaceController } from './workspaces.controller';
import { WorkspaceService } from './workspaces.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { UserEntity } from '../user/user.entity';
import { WorkspaceUserEntity } from './workspace_user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkspaceEntity,
      UserEntity,
      WorkspaceUserEntity,
    ]),
    ConfigModule,
    AuthModule,
    UserModule,
  ],
  controllers: [WorkspaceController],
  providers: [Logger, WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
