import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingAccountController } from './savings_account.controller';
import { SavingAccountEntity } from './savings_account.entity';
import { SavingAccountService } from './savings_account.service';
import { AuthModule } from '../auth/auth.module';
import { BillingPeriodModule } from '../billing_period/billing_period.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavingAccountEntity]),
    AuthModule,
    BillingPeriodModule,
  ],
  controllers: [SavingAccountController],
  providers: [SavingAccountService],
  exports: [SavingAccountService],
})
export class SavingAccountModule {}
