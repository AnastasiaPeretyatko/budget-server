import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesEntity } from './categories.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { AuthModule } from '../auth/auth.module';
import { BillingPeriodModule } from '../billing_period/billing_period.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoriesEntity]),
    AuthModule,
    BillingPeriodModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
