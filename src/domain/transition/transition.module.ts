import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { TransitionService } from './transition.service';
import { TransitionController } from './transition.controller';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { WorkspaceEntity } from '../workspace/workspaces.entity';
import { WorkspaceModule } from '../workspace/workspaces.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransitionEntity,
      SavingAccountEntity,
      WorkspaceEntity,
    ]),
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [TransitionController],
  providers: [TransitionService, Logger],
  exports: [TransitionService],
})
export class TransitionModule {}
