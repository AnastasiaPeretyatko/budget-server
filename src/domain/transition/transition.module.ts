import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { TransitionService } from './transition.service';
import { TransitionController } from './transition.controller';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { WorkspaceEntity } from '../workspace/workspaces.entity';
import { WorkspaceModule } from '../workspace/workspaces.module';
import { AuthModule } from '../auth/auth.module';
import { BillingPeriodModule } from '../billing_period/billing_period.module';
import { TagsModule } from '../tags/tags.module';
import { TagEntity } from '../tags/tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransitionEntity,
      SavingAccountEntity,
      WorkspaceEntity,
      TagEntity,
    ]),
    WorkspaceModule,
    AuthModule,
    BillingPeriodModule,
    TagsModule,
  ],
  controllers: [TransitionController],
  providers: [TransitionService],
  exports: [TransitionService],
})
export class TransitionModule {}
