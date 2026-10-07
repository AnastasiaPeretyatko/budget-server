import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPeriodController } from './billing_period.controller';
import { BillingPeriodEntity } from './billing_period.entity';
import { BillingPeriodService } from './billing_period.service';
import { BillingPeriodSummaryService } from './billing_period_summary.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BillingPeriodEntity]), AuthModule],
  controllers: [BillingPeriodController],
  providers: [BillingPeriodService, BillingPeriodSummaryService],
  exports: [BillingPeriodService],
})
export class BillingPeriodModule {}
