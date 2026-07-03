import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { TransitionEntity } from '../transition/transition.entity';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { AuthModule } from '../auth/auth.module';
import { BillingPeriodModule } from '../billing_period/billing_period.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransitionEntity, SavingAccountEntity]),
    AuthModule,
    BillingPeriodModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
